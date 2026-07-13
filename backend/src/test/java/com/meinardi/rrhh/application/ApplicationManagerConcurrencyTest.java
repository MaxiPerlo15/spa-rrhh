package com.meinardi.rrhh.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.meinardi.rrhh.domain.model.*;
import com.meinardi.rrhh.infrastructure.CandidatoRepository;
import com.meinardi.rrhh.infrastructure.PostulacionRepository;
import com.meinardi.rrhh.infrastructure.VacanteRepository;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Concurrency-safe intake tests for {@link ApplicationManager}.
 *
 * <p>These tests use real concurrent thread execution (via {@link CountDownLatch}) to verify that
 * ApplicationManager's logic correctly handles the race condition where two concurrent submissions
 * arrive for the same personKey.
 *
 * <p>The mock repository uses {@link AtomicInteger} counters to simulate the serialized behavior
 * that {@code SELECT FOR UPDATE} provides at the database level: the first call returns empty
 * (Thread 1 creates the candidate), subsequent calls return the persisted candidate (Thread 2
 * detects the duplicate).
 *
 * <p>Important: The real concurrency guarantee comes from {@code @Lock(LockModeType.PESSIMISTIC_WRITE)}
 * on {@code CandidatoRepository.findByPersonKey}, which serializes threads at the database level.
 * This unit test verifies the ApplicationManager logic handles the serialized scenario correctly.
 * The lock annotation itself is verified in
 * {@link com.meinardi.rrhh.infrastructure.CandidatoRepositoryTest#findByPersonKeyHasPessimisticWriteLock}.
 */
@ExtendWith(MockitoExtension.class)
class ApplicationManagerConcurrencyTest {

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
    v.setId(id);
    return v;
  }

  private SubmitApplicationCommand createSameIdentityCommand() {
    return new SubmitApplicationCommand(
        "v1", "Juan Perez", "juan@test.com", "+54123456789", null, null, null, "Cover letter");
  }

  /**
   * Real concurrent execution: two threads race to submit for the same personKey. Uses {@link
   * CountDownLatch} as a barrier so both threads start simultaneously, creating a genuine race
   * condition. The mock's {@link AtomicInteger} counters simulate the serialized behavior that
   * {@code SELECT FOR UPDATE} provides: first call returns empty (candidate creation), subsequent
   * calls return the persisted candidate (duplicate detection).
   *
   * <p>Verifies: exactly one submission succeeds (201) and one is rejected (409 with "reciente"
   * message), regardless of which thread wins the race.
   */
  @Test
  void concurrentSubmissionsForSamePersonKeyOneSucceedsOneRejected() throws InterruptedException {
    Vacante vacancy = createActiveVacancy("v1");
    SubmitApplicationCommand cmd = createSameIdentityCommand();
    String personKey = ApplicationManager.buildPersonKey("juan@test.com", "+54123456789");

    Candidato newCandidato =
        Candidato.create("Juan Perez", "juan@test.com", "+54123456789", "");
    newCandidato.setPersonKey(personKey);
    newCandidato.setId("c1");

    Postulacion firstPostulacion =
        Postulacion.createForVacancy(vacancy, newCandidato, "Cover letter");

    // Simulate SELECT FOR UPDATE: first call returns empty (Thread 1 creates candidate),
    // subsequent calls return the persisted candidate (Thread 2 detects duplicate).
    AtomicInteger findByPersonKeyCallCount = new AtomicInteger(0);
    when(candidatoRepository.findByPersonKey(personKey))
        .thenAnswer(
            inv -> {
              int call = findByPersonKeyCallCount.getAndIncrement();
              return call == 0 ? Optional.empty() : Optional.of(newCandidato);
            });
    when(candidatoRepository.save(any())).thenReturn(newCandidato);
    when(vacanteRepository.findById("v1")).thenReturn(Optional.of(vacancy));

    // Thread 1: no recent postulacion; Thread 2: sees Thread 1's postulacion
    AtomicInteger duplicateCheckCount = new AtomicInteger(0);
    when(postulacionRepository.findRecentByCandidatoAndVacante(eq("c1"), eq("v1"), any()))
        .thenAnswer(
            inv -> {
              int call = duplicateCheckCount.getAndIncrement();
              return call == 0 ? List.of() : List.of(firstPostulacion);
            });
    when(postulacionRepository.save(any())).thenReturn(firstPostulacion);

    // Real concurrent execution: both threads start simultaneously
    final CountDownLatch startBarrier = new CountDownLatch(1);
    final Postulacion[] results = new Postulacion[2];
    final Exception[] exceptions = new Exception[2];

    Thread t1 =
        new Thread(
            () -> {
              try {
                startBarrier.await(5, TimeUnit.SECONDS);
                results[0] = applicationManager.submitApplication(cmd);
              } catch (Exception e) {
                exceptions[0] = e;
              }
            });

    Thread t2 =
        new Thread(
            () -> {
              try {
                startBarrier.await(5, TimeUnit.SECONDS);
                results[1] = applicationManager.submitApplication(cmd);
              } catch (Exception e) {
                exceptions[1] = e;
              }
            });

    t1.start();
    t2.start();
    startBarrier.countDown(); // Release both threads simultaneously

    t1.join(10_000);
    t2.join(10_000);

    // Exactly one succeeds, one is rejected — regardless of which thread won the race
    long successCount = 0;
    long rejectionCount = 0;
    for (int i = 0; i < 2; i++) {
      if (results[i] != null) {
        assertThat(results[i].getEstadoActual()).isEqualTo(ApplicationStatus.PENDING);
        successCount++;
      }
      if (exceptions[i] != null) {
        assertThat(exceptions[i])
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("reciente");
        rejectionCount++;
      }
    }
    assertThat(successCount).isEqualTo(1);
    assertThat(rejectionCount).isEqualTo(1);
  }

  /**
   * Real concurrent spontaneous submissions (no vacancy) for the same personKey. Same protection
   * mechanism: first succeeds, second rejected within 24h.
   */
  @Test
  void concurrentSpontaneousSubmissionsOneSucceedsOneRejected() throws InterruptedException {
    SubmitApplicationCommand cmd =
        new SubmitApplicationCommand(
            null, "Juan Perez", "juan@test.com", "+54123456789", null, null, null, "Interested");

    Candidato newCandidato =
        Candidato.create("Juan Perez", "juan@test.com", "+54123456789", "");
    newCandidato.setPersonKey(
        ApplicationManager.buildPersonKey("juan@test.com", "+54123456789"));
    newCandidato.setId("c1");

    Postulacion firstPostulacion = Postulacion.createSpontaneous(newCandidato, "Interested");

    // Simulate SELECT FOR UPDATE behavior via atomic counters
    AtomicInteger findByPersonKeyCallCount = new AtomicInteger(0);
    when(candidatoRepository.findByPersonKey(any()))
        .thenAnswer(
            inv -> {
              int call = findByPersonKeyCallCount.getAndIncrement();
              return call == 0 ? Optional.empty() : Optional.of(newCandidato);
            });
    when(candidatoRepository.save(any())).thenReturn(newCandidato);

    AtomicInteger spontaneousCheckCount = new AtomicInteger(0);
    when(postulacionRepository.findRecentSpontaneousByCandidato(eq("c1"), any()))
        .thenAnswer(
            inv -> {
              int call = spontaneousCheckCount.getAndIncrement();
              return call == 0 ? List.of() : List.of(firstPostulacion);
            });
    when(postulacionRepository.save(any())).thenReturn(firstPostulacion);

    // Real concurrent execution
    final CountDownLatch startBarrier = new CountDownLatch(1);
    final Postulacion[] results = new Postulacion[2];
    final Exception[] exceptions = new Exception[2];

    Thread t1 =
        new Thread(
            () -> {
              try {
                startBarrier.await(5, TimeUnit.SECONDS);
                results[0] = applicationManager.submitApplication(cmd);
              } catch (Exception e) {
                exceptions[0] = e;
              }
            });

    Thread t2 =
        new Thread(
            () -> {
              try {
                startBarrier.await(5, TimeUnit.SECONDS);
                results[1] = applicationManager.submitApplication(cmd);
              } catch (Exception e) {
                exceptions[1] = e;
              }
            });

    t1.start();
    t2.start();
    startBarrier.countDown();

    t1.join(10_000);
    t2.join(10_000);

    long successCount = 0;
    long rejectionCount = 0;
    for (int i = 0; i < 2; i++) {
      if (results[i] != null) {
        assertThat(results[i].getEstadoActual()).isEqualTo(ApplicationStatus.PENDING);
        successCount++;
      }
      if (exceptions[i] != null) {
        assertThat(exceptions[i])
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("reciente");
        rejectionCount++;
      }
    }
    assertThat(successCount).isEqualTo(1);
    assertThat(rejectionCount).isEqualTo(1);
  }
}
