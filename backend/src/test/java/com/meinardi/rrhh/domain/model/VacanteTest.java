package com.meinardi.rrhh.domain.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class VacanteTest {
  @Test
  void createInitializesVacancyInCreatedState() {
    Vacante vacancy =
        Vacante.create(
            "Java Developer",
            "Backend position",
            "Spring Boot",
            new Ubicacion("Cordoba", "Las Varillas"),
            Jornada.FULL_TIME,
            Modalidad.HYBRID);

    assertThat(vacancy.getTitulo()).isEqualTo("Java Developer");
    assertThat(vacancy.getEstadoActual()).isEqualTo(VacancyStatus.CREATED);
    assertThat(vacancy.getFechaCreacion()).isNotNull();
    assertThat(vacancy.canReceiveApplications()).isFalse();
  }

  @Test
  void createRejectsBlankTitle() {
    assertThatThrownBy(
            () ->
                Vacante.create(
                    " ",
                    "Backend position",
                    "Spring Boot",
                    new Ubicacion("Cordoba", "Las Varillas"),
                    Jornada.FULL_TIME,
                    Modalidad.HYBRID))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("titulo");
  }

  @Test
  void activeVacancyCanReceiveApplications() {
    Vacante vacancy =
        Vacante.create(
            "Java Developer",
            "Backend position",
            "Spring Boot",
            new Ubicacion("Cordoba", "Las Varillas"),
            Jornada.FULL_TIME,
            Modalidad.HYBRID);

    vacancy.activar();

    assertThat(vacancy.getEstadoActual()).isEqualTo(VacancyStatus.ACTIVE);
    assertThat(vacancy.canReceiveApplications()).isTrue();
  }

  @Test
  void updateDetailsChangesBusinessDataWithoutChangingStatus() {
    Vacante vacancy =
        Vacante.create(
            "Java Developer",
            "Backend position",
            "Spring Boot",
            new Ubicacion("Cordoba", "Las Varillas"),
            Jornada.FULL_TIME,
            Modalidad.HYBRID);
    vacancy.activar();

    vacancy.updateDetails(
        "Senior Java Developer",
        "Updated backend position",
        "Spring Boot, PostgreSQL",
        new Ubicacion("Buenos Aires", "CABA"),
        Jornada.PART_TIME,
        Modalidad.REMOTE);

    assertThat(vacancy.getTitulo()).isEqualTo("Senior Java Developer");
    assertThat(vacancy.getDescripcion()).isEqualTo("Updated backend position");
    assertThat(vacancy.getRequisitos()).isEqualTo("Spring Boot, PostgreSQL");
    assertThat(vacancy.getUbicacion().getNombre()).isEqualTo("Buenos Aires");
    assertThat(vacancy.getJornada()).isEqualTo(Jornada.PART_TIME);
    assertThat(vacancy.getModalidad()).isEqualTo(Modalidad.REMOTE);
    assertThat(vacancy.getEstadoActual()).isEqualTo(VacancyStatus.ACTIVE);
  }

  @Test
  void activateRejectsClosedVacancy() {
    Vacante vacancy =
        Vacante.create(
            "Java Developer",
            "Backend position",
            "Spring Boot",
            new Ubicacion("Cordoba", "Las Varillas"),
            Jornada.FULL_TIME,
            Modalidad.HYBRID);
    vacancy.cerrar();

    assertThatThrownBy(vacancy::activar)
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("cerrada");
  }

  @Test
  void activateRejectsAlreadyActiveVacancy() {
    Vacante vacancy =
        Vacante.create(
            "Java Developer",
            "Backend position",
            "Spring Boot",
            new Ubicacion("Cordoba", "Las Varillas"),
            Jornada.FULL_TIME,
            Modalidad.HYBRID);
    vacancy.activar();

    assertThatThrownBy(vacancy::activar)
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("activa");
  }

  @Test
  void deactivateActiveVacancyPreventsReceivingApplications() {
    Vacante vacancy =
        Vacante.create(
            "Java Developer",
            "Backend position",
            "Spring Boot",
            new Ubicacion("Cordoba", "Las Varillas"),
            Jornada.FULL_TIME,
            Modalidad.HYBRID);
    vacancy.activar();

    vacancy.desactivar();

    assertThat(vacancy.getEstadoActual()).isEqualTo(VacancyStatus.INACTIVE);
    assertThat(vacancy.canReceiveApplications()).isFalse();
  }

  @Test
  void deactivateRejectsNonActiveVacancy() {
    Vacante vacancy =
        Vacante.create(
            "Java Developer",
            "Backend position",
            "Spring Boot",
            new Ubicacion("Cordoba", "Las Varillas"),
            Jornada.FULL_TIME,
            Modalidad.HYBRID);

    assertThatThrownBy(vacancy::desactivar)
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("activa");
  }

  @Test
  void closePreventsReceivingApplications() {
    Vacante vacancy =
        Vacante.create(
            "Java Developer",
            "Backend position",
            "Spring Boot",
            new Ubicacion("Cordoba", "Las Varillas"),
            Jornada.FULL_TIME,
            Modalidad.HYBRID);
    vacancy.activar();

    vacancy.cerrar();

    assertThat(vacancy.getEstadoActual()).isEqualTo(VacancyStatus.CLOSED);
    assertThat(vacancy.canReceiveApplications()).isFalse();
  }

  @Test
  void closeRejectsAlreadyClosedVacancy() {
    Vacante vacancy =
        Vacante.create(
            "Java Developer",
            "Backend position",
            "Spring Boot",
            new Ubicacion("Cordoba", "Las Varillas"),
            Jornada.FULL_TIME,
            Modalidad.HYBRID);
    vacancy.cerrar();

    assertThatThrownBy(vacancy::cerrar)
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("cerrada");
  }
}
