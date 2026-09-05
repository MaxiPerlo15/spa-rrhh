package com.meinardi.rrhh.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.meinardi.rrhh.domain.model.*;
import com.meinardi.rrhh.infrastructure.CandidatoRepository;
import com.meinardi.rrhh.infrastructure.PostulacionRepository;
import com.meinardi.rrhh.infrastructure.VacanteRepository;
import com.meinardi.rrhh.presentation.ApplicationDetailResponse;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class ApplicationManagerTest {

  @Mock private CandidatoRepository candidatoRepository;
  @Mock private PostulacionRepository postulacionRepository;
  @Mock private VacanteRepository vacanteRepository;

  private ApplicationManager applicationManager;

  @BeforeEach
  void setUp() {
    applicationManager =
        new ApplicationManager(candidatoRepository, postulacionRepository, vacanteRepository);
  }

  private Vacante createActiveVacancy(String id) {
    Vacante v =
        Vacante.create(
            "Developer", "Backend", "Java", new Ubicacion("BA", "CABA"),
            Jornada.FULL_TIME, Modalidad.HYBRID);
    v.activar();
    // Use reflection or setter to set id for test
    v.setId(id);
    return v;
  }

  // --- personKey parity tests ---

  @Test
  void buildPersonKeyProducesSha256Hex() {
    // Parity with Next buildPersonKey("Juan@Example.com", "+54 11 1234-5678")
    String key = ApplicationManager.buildPersonKey("Juan@Example.com", "+54 11 1234-5678");

    // Exact SHA-256 of "juan@example.com|+541112345678"
    // Computed via: echo -n "juan@example.com|+541112345678" | shasum -a 256
    assertThat(key).isEqualTo("7662e25d3b2c00ddac717fd703e1188ce5bf995a73f320233b44b186934153bc");
  }

  @Test
  void buildPersonKeyProducesConsistentHashAcrossImplementations() {
    // Triangulation: verify parity with a second known input
    // SHA-256 of "maria@google.com|+54911222333" → compute independently
    String key = ApplicationManager.buildPersonKey("Maria@Google.com", "+54 91 1222-333");
    assertThat(key).isEqualTo("9831356ef7d00a04ff0cc1b9063f013ce276d9f0f75a79b49c92f4aa9b151e46");
  }

  @Test
  void buildPersonKeyNormalizesEmailToLowercase() {
    String key1 = ApplicationManager.buildPersonKey("Test@Example.COM", "+54123456789");
    String key2 = ApplicationManager.buildPersonKey("test@example.com", "+54123456789");

    assertThat(key1).isEqualTo(key2);
  }

  @Test
  void buildPersonKeyPreservesLeadingPlus() {
    String withPlus = ApplicationManager.buildPersonKey("a@b.com", "+1234567");
    String withoutPlus = ApplicationManager.buildPersonKey("a@b.com", "1234567");

    assertThat(withPlus).isNotEqualTo(withoutPlus);
  }

  @Test
  void buildPersonKeyStripsNonDigitFromPhone() {
    String clean = ApplicationManager.buildPersonKey("a@b.com", "+541112345678");
    String withSpaces = ApplicationManager.buildPersonKey("a@b.com", "+54 11 1234-5678");

    assertThat(clean).isEqualTo(withSpaces);
  }

  // --- submitApplication tests ---

  @Test
  void submitApplicationCreatesNewPostulacion() {
    Vacante vacancy = createActiveVacancy("v1");
    SubmitApplicationCommand cmd =
        new SubmitApplicationCommand(
            "v1", "Juan Perez", "juan@test.com", "+54123456789", null, null, null, "Cover");

    when(candidatoRepository.findByPersonKey(any())).thenReturn(Optional.empty());
    when(candidatoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    when(vacanteRepository.findById("v1")).thenReturn(Optional.of(vacancy));
    when(postulacionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    Postulacion result = applicationManager.submitApplication(cmd);

    assertThat(result.getEstadoActual()).isEqualTo(ApplicationStatus.PENDING);
    assertThat(result.getVacante()).isNotNull();
    verify(candidatoRepository).save(any());
    verify(postulacionRepository).save(any());
  }

  @Test
  void submitApplicationUpsertsExistingCandidate() {
    Vacante vacancy = createActiveVacancy("v1");
    Candidato existing = Candidato.create("Old Name", "juan@test.com", "+54123456789", "old.pdf");
    existing.setPersonKey(ApplicationManager.buildPersonKey("juan@test.com", "+54123456789"));
    existing.setId("c1");

    SubmitApplicationCommand cmd =
        new SubmitApplicationCommand(
            "v1", "New Name", "juan@test.com", "+54123456789", "new.pdf", "resume.pdf", "key1", "Cover");

    when(candidatoRepository.findByPersonKey(any())).thenReturn(Optional.of(existing));
    when(vacanteRepository.findById("v1")).thenReturn(Optional.of(vacancy));
    when(postulacionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    Postulacion result = applicationManager.submitApplication(cmd);

    // Should update existing candidate name and resume
    assertThat(existing.getNombre()).isEqualTo("New Name");
    assertThat(existing.getResumeUrl()).isEqualTo("new.pdf");
    verify(candidatoRepository, never()).save(any());
    verify(postulacionRepository).save(any());
  }

  @Test
  void submitApplicationRejectsDuplicateWithin24h() {
    Vacante vacancy = createActiveVacancy("v1");
    Candidato existing = Candidato.create("Juan", "juan@test.com", "+54123", "cv.pdf");
    existing.setId("c1");

    Postulacion recentPostulacion = Postulacion.createForVacancy(vacancy, existing, "old cover");
    recentPostulacion.setFechaPostulacion(OffsetDateTime.now().minusHours(2));

    SubmitApplicationCommand cmd =
        new SubmitApplicationCommand(
            "v1", "Juan", "juan@test.com", "+54123", null, null, null, "new cover");

    when(candidatoRepository.findByPersonKey(any())).thenReturn(Optional.of(existing));
    when(vacanteRepository.findById("v1")).thenReturn(Optional.of(vacancy));
    when(postulacionRepository.findRecentByCandidatoAndVacante(eq("c1"), eq("v1"), any()))
        .thenReturn(List.of(recentPostulacion));

    assertThatThrownBy(() -> applicationManager.submitApplication(cmd))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("reciente");
  }

  @Test
  void submitApplicationAllowsReapplicationAfter24h() {
    Vacante vacancy = createActiveVacancy("v1");
    Candidato existing = Candidato.create("Juan", "juan@test.com", "+54123", "cv.pdf");
    existing.setId("c1");

    SubmitApplicationCommand cmd =
        new SubmitApplicationCommand(
            "v1", "Juan", "juan@test.com", "+54123", null, null, null, "cover");

    when(candidatoRepository.findByPersonKey(any())).thenReturn(Optional.of(existing));
    when(vacanteRepository.findById("v1")).thenReturn(Optional.of(vacancy));
    when(postulacionRepository.findRecentByCandidatoAndVacante(eq("c1"), eq("v1"), any()))
        .thenReturn(List.of()); // No recent postulacion
    when(postulacionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    Postulacion result = applicationManager.submitApplication(cmd);

    assertThat(result.getEstadoActual()).isEqualTo(ApplicationStatus.PENDING);
  }

  @Test
  void submitApplicationRejectsInvalidVacancy() {
    SubmitApplicationCommand cmd =
        new SubmitApplicationCommand(
            "nonexistent", "Juan", "juan@test.com", "+54123", null, null, null, null);

    when(candidatoRepository.findByPersonKey(any())).thenReturn(Optional.empty());
    when(candidatoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    when(vacanteRepository.findById("nonexistent")).thenReturn(Optional.empty());

    assertThatThrownBy(() -> applicationManager.submitApplication(cmd))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("vacante");
  }

  @Test
  void submitApplicationRejectsInactiveVacancy() {
    Vacante vacancy =
        Vacante.create(
            "Dev", "desc", "reqs", new Ubicacion("BA", "CABA"),
            Jornada.FULL_TIME, Modalidad.HYBRID);
    vacancy.setId("v1");
    // Not activated — canReceiveApplications returns false

    SubmitApplicationCommand cmd =
        new SubmitApplicationCommand(
            "v1", "Juan", "juan@test.com", "+54123", null, null, null, null);

    when(candidatoRepository.findByPersonKey(any())).thenReturn(Optional.empty());
    when(candidatoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    when(vacanteRepository.findById("v1")).thenReturn(Optional.of(vacancy));

    assertThatThrownBy(() -> applicationManager.submitApplication(cmd))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("activas");
  }

  @Test
  void submitApplicationAllowsSpontaneousWithNullVacancyId() {
    SubmitApplicationCommand cmd =
        new SubmitApplicationCommand(
            null, "Juan", "juan@test.com", "+54123", null, null, null, "I want to apply");

    when(candidatoRepository.findByPersonKey(any())).thenReturn(Optional.empty());
    when(candidatoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    when(postulacionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    Postulacion result = applicationManager.submitApplication(cmd);

    assertThat(result.getVacante()).isNull();
    assertThat(result.getEstadoActual()).isEqualTo(ApplicationStatus.PENDING);
  }

  // --- listApplications tests ---

  @Test
  void listApplicationsReturnsAllWhenNoFilters() {
    Postulacion p = Postulacion.createSpontaneous(
        Candidato.create("J", "j@test.com", "+123", "cv"), "cover");
    when(postulacionRepository.findAll()).thenReturn(List.of(p));

    List<Postulacion> results = applicationManager.listApplications(null, null);

    assertThat(results).hasSize(1);
  }

  @Test
  void listApplicationsFiltersCandidateSearchCaseInsensitively() {
    Postulacion p = Postulacion.createSpontaneous(Candidato.create("Ana Pérez", "ana@empresa.com", "+54123", "cv"), "cover");
    when(postulacionRepository.findAll()).thenReturn(List.of(p));
    assertThat(applicationManager.listApplications(null, null, "ANA PÉREZ")).containsExactly(p);
  }

  @Test
  void listApplicationsSortsCandidateNameAndSubmittedAt() {
    Postulacion zeta = Postulacion.createSpontaneous(Candidato.create("Zeta", "z@test.com", "+123", "cv"), "cover");
    Postulacion ana = Postulacion.createSpontaneous(Candidato.create("Ana", "a@test.com", "+124", "cv"), "cover");
    when(postulacionRepository.findAll()).thenReturn(List.of(zeta, ana));

    assertThat(applicationManager.listApplications(null, null, null, "candidateName", "asc"))
        .containsExactly(ana, zeta);
  }

  // --- admin lifecycle: getById ---

  @Test
  void getByIdReturnsDetailResponseWhenFound() {
    Postulacion p = createPostulacionWithRelations("app-1", ApplicationStatus.PENDING);
    when(postulacionRepository.findByIdWithCandidatoAndVacante("app-1"))
        .thenReturn(Optional.of(p));

    ApplicationDetailResponse result = applicationManager.getById("app-1");

    assertThat(result.id()).isEqualTo("app-1");
    assertThat(result.candidateName()).isEqualTo("Test User");
    assertThat(result.email()).isEqualTo("test@test.com");
    assertThat(result.status()).isEqualTo("PENDING");
    assertThat(result.vacancy()).isNotNull();
    assertThat(result.vacancy().id()).isEqualTo("v1");
  }

  @Test
  void getByIdThrowsNotFoundWhenMissing() {
    when(postulacionRepository.findByIdWithCandidatoAndVacante("missing"))
        .thenReturn(Optional.empty());

    assertThatThrownBy(() -> applicationManager.getById("missing"))
        .isInstanceOf(ResponseStatusException.class)
        .satisfies(ex -> {
          ResponseStatusException rse = (ResponseStatusException) ex;
          assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        });
  }

  // --- admin lifecycle: updateStatus ---

  @Test
  void updateStatusValidTransitionReturnsUpdatedResponse() {
    Postulacion p = createPostulacionWithRelations("app-1", ApplicationStatus.PENDING);
    when(postulacionRepository.findByIdWithCandidatoAndVacante("app-1"))
        .thenReturn(Optional.of(p));
    when(postulacionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    ApplicationDetailResponse result = applicationManager.updateStatus("app-1", "REVIEWING");

    assertThat(result.status()).isEqualTo("REVIEWING");
    verify(postulacionRepository).save(any());
  }

  @Test
  void updateStatusInvalidTransitionThrowsIllegalState() {
    Postulacion p = createPostulacionWithRelations("app-1", ApplicationStatus.PENDING);
    when(postulacionRepository.findByIdWithCandidatoAndVacante("app-1"))
        .thenReturn(Optional.of(p));

    assertThatThrownBy(() -> applicationManager.updateStatus("app-1", "INTERVIEWED"))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("inválida");
  }

  @Test
  void updateStatusSameStateThrowsIllegalState() {
    Postulacion p = createPostulacionWithRelations("app-1", ApplicationStatus.REVIEWING);
    when(postulacionRepository.findByIdWithCandidatoAndVacante("app-1"))
        .thenReturn(Optional.of(p));

    assertThatThrownBy(() -> applicationManager.updateStatus("app-1", "REVIEWING"))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("ya se encuentra");
  }

  @Test
  void updateStatusNotFoundThrowsNotFound() {
    when(postulacionRepository.findByIdWithCandidatoAndVacante("missing"))
        .thenReturn(Optional.empty());

    assertThatThrownBy(() -> applicationManager.updateStatus("missing", "REVIEWING"))
        .isInstanceOf(ResponseStatusException.class)
        .satisfies(ex -> {
          ResponseStatusException rse = (ResponseStatusException) ex;
          assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        });
  }

  // --- admin lifecycle: delete ---

  @Test
  void deleteRemovesExistingPostulacion() {
    Postulacion p = createPostulacionWithRelations("app-1", ApplicationStatus.PENDING);
    when(postulacionRepository.findById("app-1")).thenReturn(Optional.of(p));

    applicationManager.delete("app-1");

    verify(postulacionRepository).delete(p);
  }

  @Test
  void deleteNotFoundThrowsNotFound() {
    when(postulacionRepository.findById("missing")).thenReturn(Optional.empty());

    assertThatThrownBy(() -> applicationManager.delete("missing"))
        .isInstanceOf(ResponseStatusException.class)
        .satisfies(ex -> {
          ResponseStatusException rse = (ResponseStatusException) ex;
          assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        });
    verify(postulacionRepository, never()).delete(any());
  }

  // --- helper for admin lifecycle tests ---

  private Postulacion createPostulacionWithRelations(String id, ApplicationStatus status) {
    Vacante vacancy = createActiveVacancy("v1");
    Candidato candidato = Candidato.create("Test User", "test@test.com", "+54123", "cv.pdf");
    candidato.setId("c1");

    Postulacion p = Postulacion.createForVacancy(vacancy, candidato, "Cover");
    p.setId(id);
    p.setEstadoActual(status);
    p.setFechaPostulacion(OffsetDateTime.parse("2026-07-08T12:00:00Z"));
    return p;
  }
}
