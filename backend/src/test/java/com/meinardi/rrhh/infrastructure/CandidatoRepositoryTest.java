package com.meinardi.rrhh.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import com.meinardi.rrhh.domain.model.Candidato;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.transaction.annotation.Transactional;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
class CandidatoRepositoryTest {

  @Autowired private CandidatoRepository candidatoRepository;
  @Autowired private TestEntityManager entityManager;

  private Candidato persistCandidato(String personKey) {
    Candidato c = Candidato.create("Juan Perez", "juan@example.com", "+54123456789", "cv.pdf");
    c.setPersonKey(personKey);
    entityManager.persist(c);
    entityManager.flush();
    return c;
  }

  @Test
  void findByPersonKeyReturnsExistingCandidate() {
    Candidato saved = persistCandidato("abc123hash");

    var found = candidatoRepository.findByPersonKey("abc123hash");

    assertThat(found).isPresent();
    assertThat(found.get().getPersonKey()).isEqualTo("abc123hash");
    assertThat(found.get().getNombre()).isEqualTo("Juan Perez");
  }

  @Test
  void findByPersonKeyReturnsEmptyForUnknownKey() {
    var found = candidatoRepository.findByPersonKey("nonexistent");

    assertThat(found).isEmpty();
  }

  @Test
  void findByPersonKeyIsExactMatch() {
    persistCandidato("abc123hash");

    var found = candidatoRepository.findByPersonKey("ABC123HASH");

    assertThat(found).isEmpty();
  }

  @Test
  void findByPersonKeyHasPessimisticWriteLock() throws NoSuchMethodException {
    // Verify that findByPersonKey uses SELECT FOR UPDATE as design requires
    Method method = CandidatoRepository.class.getMethod("findByPersonKey", String.class);
    Lock lockAnnotation = method.getAnnotation(Lock.class);

    assertThat(lockAnnotation).isNotNull();
    assertThat(lockAnnotation.value()).isEqualTo(LockModeType.PESSIMISTIC_WRITE);
  }
}
