package com.meinardi.rrhh.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.meinardi.rrhh.domain.model.Candidato;
import com.meinardi.rrhh.domain.model.Postulacion;
import com.meinardi.rrhh.infrastructure.CandidatoRepository;
import com.meinardi.rrhh.infrastructure.PostulacionRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class CandidateAdminServiceTest {

  private CandidatoRepository candidatoRepository;
  private PostulacionRepository postulacionRepository;
  private CandidateAdminService service;

  @BeforeEach
  void setUp() {
    candidatoRepository = mock(CandidatoRepository.class);
    postulacionRepository = mock(PostulacionRepository.class);
    service = new CandidateAdminService(candidatoRepository, postulacionRepository);
  }

  @Test
  void manualCreate_createsCandidatoAndSpontaneousPostulacion() {
    when(candidatoRepository.findByPersonKey(anyString())).thenReturn(Optional.empty());
    when(candidatoRepository.save(any(Candidato.class)))
        .thenAnswer(invocation -> {
          Candidato c = invocation.getArgument(0);
          c.setId("new-cand-id");
          return c;
        });
    when(postulacionRepository.save(any(Postulacion.class)))
        .thenAnswer(invocation -> {
          Postulacion p = invocation.getArgument(0);
          p.setId("new-app-id");
          return p;
        });

    var result = service.manualCreate("Maria Garcia", "maria@test.com", "+54 11 9999-0000", "Notes");

    ArgumentCaptor<Candidato> candCaptor = ArgumentCaptor.forClass(Candidato.class);
    verify(candidatoRepository).save(candCaptor.capture());
    Candidato saved = candCaptor.getValue();
    assertThat(saved.getNombre()).isEqualTo("Maria Garcia");
    assertThat(saved.getEmail()).isEqualTo("maria@test.com");
    assertThat(saved.getPersonKey()).isNotBlank();

    ArgumentCaptor<Postulacion> appCaptor = ArgumentCaptor.forClass(Postulacion.class);
    verify(postulacionRepository).save(appCaptor.capture());
    Postulacion savedApp = appCaptor.getValue();
    assertThat(savedApp.getVacante()).isNull();
    assertThat(savedApp.getObservacion()).isEqualTo("Notes");

    assertThat(result.candidateId()).isEqualTo("new-cand-id");
    assertThat(result.applicationId()).isEqualTo("new-app-id");
  }

  @Test
  void manualCreate_rejectsDuplicatePersonKey() {
    Candidato existing = mock(Candidato.class);
    when(existing.getId()).thenReturn("existing-id");
    when(candidatoRepository.findByPersonKey(anyString())).thenReturn(Optional.of(existing));

    assertThatThrownBy(
            () -> service.manualCreate("Maria Garcia", "maria@test.com", "+54 11 9999-0000", null))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("DUPLICATE_CANDIDATE");
  }

  @Test
  void updateIdentity_updatesPersonKeyAndReturnsCandidate() {
    Candidato candidato = mock(Candidato.class);
    when(candidato.getId()).thenReturn("cand-1");
    when(candidato.getPersonKey()).thenReturn("old-person-key");
    when(candidatoRepository.findById("cand-1")).thenReturn(Optional.of(candidato));
    when(candidatoRepository.findByPersonKey(anyString())).thenReturn(Optional.empty());
    when(candidatoRepository.save(any(Candidato.class))).thenAnswer(inv -> inv.getArgument(0));

    var result = service.updateIdentity("cand-1", "Maria G.", "newemail@test.com", "+54 11 1111-2222");

    verify(candidato).setEmail("newemail@test.com");
    verify(candidato).setTelefono("+54 11 1111-2222");
    verify(candidato).setNombre("Maria G.");
    verify(candidato).setPersonKey(anyString());
    verify(candidato).setUpdatedAt(any());
    assertThat(result.candidateId()).isEqualTo("cand-1");
  }

  @Test
  void updateIdentity_rejectsConflictWithAnotherCandidate() {
    Candidato candidato = mock(Candidato.class);
    when(candidato.getId()).thenReturn("cand-1");
    when(candidato.getPersonKey()).thenReturn("old-key");
    when(candidatoRepository.findById("cand-1")).thenReturn(Optional.of(candidato));

    Candidato conflicting = mock(Candidato.class);
    when(conflicting.getId()).thenReturn("cand-2");
    when(candidatoRepository.findByPersonKey(anyString())).thenReturn(Optional.of(conflicting));

    assertThatThrownBy(
            () -> service.updateIdentity("cand-1", "Maria", "conflict@test.com", "+54 11 0000-0000"))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("CANDIDATE_IDENTITY_CONFLICT");
  }

  @Test
  void updateIdentity_throwsNotFoundForMissingId() {
    when(candidatoRepository.findById("nonexistent")).thenReturn(Optional.empty());

    assertThatThrownBy(
            () -> service.updateIdentity("nonexistent", "Name", "a@b.com", "123"))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("not found");
  }
}
