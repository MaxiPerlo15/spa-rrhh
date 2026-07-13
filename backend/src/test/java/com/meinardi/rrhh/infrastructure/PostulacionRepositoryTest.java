package com.meinardi.rrhh.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import com.meinardi.rrhh.domain.model.*;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
class PostulacionRepositoryTest {

  @Autowired private PostulacionRepository postulacionRepository;
  @Autowired private TestEntityManager entityManager;

  private Vacante createAndPersistActiveVacancy(String title) {
    Vacante v =
        Vacante.create(
            title, "desc", "reqs", new Ubicacion("BA", "CABA"), Jornada.FULL_TIME, Modalidad.HYBRID);
    v.activar();
    entityManager.persist(v);
    return v;
  }

  private Candidato createAndPersistCandidato(String name, String email) {
    Candidato c = Candidato.create(name, email, "+54123456789", "cv.pdf");
    c.setPersonKey("pk-" + email);
    entityManager.persist(c);
    return c;
  }

  @Test
  void findRecentByCandidatoAndVacanteReturnsMatchingPostulacion() {
    Vacante v = createAndPersistActiveVacancy("Dev");
    Candidato c = createAndPersistCandidato("Juan", "juan@test.com");

    Postulacion p = Postulacion.createForVacancy(v, c, "cover");
    entityManager.persist(p);
    entityManager.flush();

    OffsetDateTime since = OffsetDateTime.now().minusHours(25);
    List<Postulacion> results =
        postulacionRepository.findRecentByCandidatoAndVacante(c.getId(), v.getId(), since);

    assertThat(results).hasSize(1);
    assertThat(results.get(0).getCandidato().getId()).isEqualTo(c.getId());
  }

  @Test
  void findRecentByCandidatoAndVacanteExcludesOlderThanWindow() {
    Vacante v = createAndPersistActiveVacancy("Dev");
    Candidato c = createAndPersistCandidato("Juan", "juan@test.com");

    Postulacion p = Postulacion.createForVacancy(v, c, "cover");
    p.setFechaPostulacion(OffsetDateTime.now().minusHours(30));
    entityManager.persist(p);
    entityManager.flush();

    OffsetDateTime since = OffsetDateTime.now().minusHours(25);
    List<Postulacion> results =
        postulacionRepository.findRecentByCandidatoAndVacante(c.getId(), v.getId(), since);

    assertThat(results).isEmpty();
  }

  @Test
  void findRecentByCandidatoAndVacanteReturnsEmptyForDifferentVacancy() {
    Vacante v1 = createAndPersistActiveVacancy("Dev");
    Vacante v2 = createAndPersistActiveVacancy("Design");
    Candidato c = createAndPersistCandidato("Juan", "juan@test.com");

    Postulacion p = Postulacion.createForVacancy(v1, c, "cover");
    entityManager.persist(p);
    entityManager.flush();

    OffsetDateTime since = OffsetDateTime.now().minusHours(25);
    List<Postulacion> results =
        postulacionRepository.findRecentByCandidatoAndVacante(c.getId(), v2.getId(), since);

    assertThat(results).isEmpty();
  }

  // --- findByIdWithCandidatoAndVacante tests ---

  @Test
  void findByIdWithCandidatoAndVacanteReturnsPostulacionWithRelations() {
    Vacante v = createAndPersistActiveVacancy("Dev");
    Candidato c = createAndPersistCandidato("Juan", "juan@test.com");

    Postulacion p = Postulacion.createForVacancy(v, c, "cover");
    entityManager.persist(p);
    entityManager.flush();
    entityManager.clear();

    java.util.Optional<Postulacion> result =
        postulacionRepository.findByIdWithCandidatoAndVacante(p.getId());

    assertThat(result).isPresent();
    Postulacion found = result.get();
    assertThat(found.getCandidato()).isNotNull();
    assertThat(found.getCandidato().getNombre()).isEqualTo("Juan");
    assertThat(found.getCandidato().getEmail()).isEqualTo("juan@test.com");
    assertThat(found.getVacante()).isNotNull();
    assertThat(found.getVacante().getTitulo()).isEqualTo("Dev");
    assertThat(found.getEstadoActual()).isEqualTo(ApplicationStatus.PENDING);
  }

  @Test
  void findByIdWithCandidatoAndVacanteReturnsEmptyForNonExistentId() {
    java.util.Optional<Postulacion> result =
        postulacionRepository.findByIdWithCandidatoAndVacante("non-existent-id");

    assertThat(result).isEmpty();
  }

  @Test
  void findByIdWithCandidatoAndVacanteHandlesSpontaneousApplication() {
    Candidato c = createAndPersistCandidato("Maria", "maria@test.com");

    Postulacion p = Postulacion.createSpontaneous(c, "spontaneous cover");
    entityManager.persist(p);
    entityManager.flush();
    entityManager.clear();

    java.util.Optional<Postulacion> result =
        postulacionRepository.findByIdWithCandidatoAndVacante(p.getId());

    assertThat(result).isPresent();
    Postulacion found = result.get();
    assertThat(found.getCandidato()).isNotNull();
    assertThat(found.getCandidato().getNombre()).isEqualTo("Maria");
    assertThat(found.getVacante()).isNull();
    assertThat(found.getEstadoActual()).isEqualTo(ApplicationStatus.PENDING);
  }
}
