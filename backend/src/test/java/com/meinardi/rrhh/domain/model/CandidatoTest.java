package com.meinardi.rrhh.domain.model;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;

class CandidatoTest {

  @Test
  void createSetsNombreAndEmailAndTelefonoAndCv() {
    Candidato c = Candidato.create("Juan Perez", "juan@example.com", "+54123456789", "cv.pdf");

    assertThat(c.getNombre()).isEqualTo("Juan Perez");
    assertThat(c.getEmail()).isEqualTo("juan@example.com");
    assertThat(c.getTelefono()).isEqualTo("+54123456789");
    assertThat(c.getCv()).isEqualTo("cv.pdf");
  }

  @Test
  void personKeyFieldDefaultsToNull() {
    Candidato c = Candidato.create("Juan", "juan@test.com", "+54123", "cv.pdf");

    assertThat(c.getPersonKey()).isNull();
  }

  @Test
  void resumeFieldsDefaultToNull() {
    Candidato c = Candidato.create("Juan", "juan@test.com", "+54123", "cv.pdf");

    assertThat(c.getResumeUrl()).isNull();
    assertThat(c.getResumeFileName()).isNull();
    assertThat(c.getResumeKey()).isNull();
  }

  @Test
  void createdAtIsSetOnCreate() {
    Candidato c = Candidato.create("Juan", "juan@test.com", "+54123", "cv.pdf");

    assertThat(c.getCreatedAt()).isNotNull();
  }

  @Test
  void updatedAtDefaultsToNull() {
    Candidato c = Candidato.create("Juan", "juan@test.com", "+54123", "cv.pdf");

    assertThat(c.getUpdatedAt()).isNull();
  }

  @Test
  void settersWorkForNewFields() {
    Candidato c = Candidato.create("Juan", "juan@test.com", "+54123", "cv.pdf");
    OffsetDateTime now = OffsetDateTime.now();

    c.setPersonKey("abc123hash");
    c.setResumeUrl("https://ufs.sh/file123");
    c.setResumeFileName("resume.pdf");
    c.setResumeKey("file123");
    c.setCreatedAt(now);
    c.setUpdatedAt(now);

    assertThat(c.getPersonKey()).isEqualTo("abc123hash");
    assertThat(c.getResumeUrl()).isEqualTo("https://ufs.sh/file123");
    assertThat(c.getResumeFileName()).isEqualTo("resume.pdf");
    assertThat(c.getResumeKey()).isEqualTo("file123");
    assertThat(c.getCreatedAt()).isEqualTo(now);
    assertThat(c.getUpdatedAt()).isEqualTo(now);
  }
}
