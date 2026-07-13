package com.meinardi.rrhh.domain.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;

class PostulacionTest {

  private Candidato testCandidato() {
    return Candidato.create("Juan Perez", "juan@example.com", "+54123456789", "cv.pdf");
  }

  private Vacante activeVacancy() {
    Vacante v =
        Vacante.create(
            "Developer",
            "Backend",
            "Java",
            new Ubicacion("BA", "CABA"),
            Jornada.FULL_TIME,
            Modalidad.HYBRID);
    v.activar();
    return v;
  }

  @Test
  void createForVacancySetsPendingStatus() {
    Postulacion p = Postulacion.createForVacancy(activeVacancy(), testCandidato(), "Cover letter");

    assertThat(p.getEstadoActual()).isEqualTo(ApplicationStatus.PENDING);
    assertThat(p.getFechaPostulacion()).isNotNull();
  }

  @Test
  void createSpontaneousCreatesWithoutVacancy() {
    Postulacion p = Postulacion.createSpontaneous(testCandidato(), "I want to apply");

    assertThat(p.getVacante()).isNull();
    assertThat(p.getCandidato()).isNotNull();
    assertThat(p.getEstadoActual()).isEqualTo(ApplicationStatus.PENDING);
    assertThat(p.getFechaPostulacion()).isNotNull();
    assertThat(p.esEspontanea()).isTrue();
  }

  @Test
  void createSpontaneousRejectsNullCandidato() {
    assertThatThrownBy(() -> Postulacion.createSpontaneous(null, "cover"))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("candidato");
  }

  @Test
  void submittedAtDefaultsToNull() {
    Postulacion p = Postulacion.createSpontaneous(testCandidato(), "cover");

    assertThat(p.getSubmittedAt()).isNull();
  }

  @Test
  void submittedAtCanBeSet() {
    Postulacion p = Postulacion.createSpontaneous(testCandidato(), "cover");
    OffsetDateTime now = OffsetDateTime.now();
    p.setSubmittedAt(now);

    assertThat(p.getSubmittedAt()).isEqualTo(now);
  }

  @Test
  void updatedAtDefaultsToNull() {
    Postulacion p = Postulacion.createSpontaneous(testCandidato(), "cover");

    assertThat(p.getUpdatedAt()).isNull();
  }

  @Test
  void updatedAtCanBeSet() {
    Postulacion p = Postulacion.createSpontaneous(testCandidato(), "cover");
    OffsetDateTime now = OffsetDateTime.now();
    p.setUpdatedAt(now);

    assertThat(p.getUpdatedAt()).isEqualTo(now);
  }

  // --- State machine delegation tests ---

  @Test
  void ponerEnRevisionDelegatesToMachineValidTransition() {
    Postulacion p = Postulacion.createSpontaneous(testCandidato(), "cover");
    // PENDING → REVIEWING is valid

    p.ponerEnRevision();

    assertThat(p.getEstadoActual()).isEqualTo(ApplicationStatus.REVIEWING);
  }

  @Test
  void ponerEnRevisionRejectsSameState() {
    Postulacion p = Postulacion.createSpontaneous(testCandidato(), "cover");
    p.ponerEnRevision(); // now REVIEWING

    assertThatThrownBy(p::ponerEnRevision)
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("REVIEWING");
    // Status unchanged
    assertThat(p.getEstadoActual()).isEqualTo(ApplicationStatus.REVIEWING);
  }

  @Test
  void ponerEnRevisionRejectsFromTerminalState() {
    Postulacion p = Postulacion.createSpontaneous(testCandidato(), "cover");
    p.ponerEnRevision();
    p.rechazar(); // REJECTED — terminal

    assertThatThrownBy(p::ponerEnRevision)
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("inválida");
    assertThat(p.getEstadoActual()).isEqualTo(ApplicationStatus.REJECTED);
  }

  @Test
  void marcarComoEntrevistadoDelegatesToMachineValidTransition() {
    Postulacion p = Postulacion.createSpontaneous(testCandidato(), "cover");
    p.ponerEnRevision(); // PENDING → REVIEWING

    p.marcarComoEntrevistado(); // REVIEWING → INTERVIEWED

    assertThat(p.getEstadoActual()).isEqualTo(ApplicationStatus.INTERVIEWED);
  }

  @Test
  void marcarComoEntrevistadoRejectsSkipLevel() {
    Postulacion p = Postulacion.createSpontaneous(testCandidato(), "cover");
    // PENDING → INTERVIEWED is a skip-level transition

    assertThatThrownBy(p::marcarComoEntrevistado)
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("inválida");
    assertThat(p.getEstadoActual()).isEqualTo(ApplicationStatus.PENDING);
  }

  @Test
  void aceptarDelegatesToMachineValidTransition() {
    Postulacion p = Postulacion.createSpontaneous(testCandidato(), "cover");
    p.ponerEnRevision();
    p.marcarComoEntrevistado(); // now INTERVIEWED

    p.aceptar(); // INTERVIEWED → ACCEPTED

    assertThat(p.getEstadoActual()).isEqualTo(ApplicationStatus.ACCEPTED);
  }

  @Test
  void aceptarRejectsFromPending() {
    Postulacion p = Postulacion.createSpontaneous(testCandidato(), "cover");
    // PENDING → ACCEPTED is invalid

    assertThatThrownBy(p::aceptar)
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("inválida");
    assertThat(p.getEstadoActual()).isEqualTo(ApplicationStatus.PENDING);
  }

  @Test
  void rechazarDelegatesToMachineValidTransition() {
    Postulacion p = Postulacion.createSpontaneous(testCandidato(), "cover");
    // PENDING → REJECTED is valid

    p.rechazar();

    assertThat(p.getEstadoActual()).isEqualTo(ApplicationStatus.REJECTED);
  }

  @Test
  void rechazarRejectsFromTerminalAccepted() {
    Postulacion p = Postulacion.createSpontaneous(testCandidato(), "cover");
    p.ponerEnRevision();
    p.marcarComoEntrevistado();
    p.aceptar(); // ACCEPTED — terminal

    assertThatThrownBy(p::rechazar)
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("inválida");
    assertThat(p.getEstadoActual()).isEqualTo(ApplicationStatus.ACCEPTED);
  }
}
