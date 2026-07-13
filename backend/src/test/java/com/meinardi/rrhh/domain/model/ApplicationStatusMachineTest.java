package com.meinardi.rrhh.domain.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class ApplicationStatusMachineTest {

  // --- Valid transitions ---

  @ParameterizedTest(name = "{0} → {1} should be allowed")
  @CsvSource({
      "PENDING, REVIEWING",
      "PENDING, REJECTED",
      "REVIEWING, INTERVIEWED",
      "REVIEWING, REJECTED",
      "INTERVIEWED, ACCEPTED",
      "INTERVIEWED, REJECTED"
  })
  void canTransitionAllowsValidTransitions(String from, String to) {
    ApplicationStatus fromStatus = ApplicationStatus.valueOf(from);
    ApplicationStatus toStatus = ApplicationStatus.valueOf(to);

    assertThat(ApplicationStatusMachine.canTransition(fromStatus, toStatus)).isTrue();
  }

  // --- Invalid transitions: terminal states ---

  @Test
  void canTransitionRejectsFromAccepted() {
    assertThat(ApplicationStatusMachine.canTransition(ApplicationStatus.ACCEPTED, ApplicationStatus.REVIEWING)).isFalse();
    assertThat(ApplicationStatusMachine.canTransition(ApplicationStatus.ACCEPTED, ApplicationStatus.INTERVIEWED)).isFalse();
    assertThat(ApplicationStatusMachine.canTransition(ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED)).isFalse();
    assertThat(ApplicationStatusMachine.canTransition(ApplicationStatus.ACCEPTED, ApplicationStatus.PENDING)).isFalse();
  }

  @Test
  void canTransitionRejectsFromRejected() {
    assertThat(ApplicationStatusMachine.canTransition(ApplicationStatus.REJECTED, ApplicationStatus.PENDING)).isFalse();
    assertThat(ApplicationStatusMachine.canTransition(ApplicationStatus.REJECTED, ApplicationStatus.REVIEWING)).isFalse();
    assertThat(ApplicationStatusMachine.canTransition(ApplicationStatus.REJECTED, ApplicationStatus.INTERVIEWED)).isFalse();
    assertThat(ApplicationStatusMachine.canTransition(ApplicationStatus.REJECTED, ApplicationStatus.ACCEPTED)).isFalse();
  }

  // --- Invalid transitions: skip-level ---

  @ParameterizedTest(name = "{0} → {1} should be rejected (skip-level)")
  @CsvSource({
      "PENDING, INTERVIEWED",
      "PENDING, ACCEPTED",
      "REVIEWING, ACCEPTED"
  })
  void canTransitionRejectsSkipLevelTransitions(String from, String to) {
    ApplicationStatus fromStatus = ApplicationStatus.valueOf(from);
    ApplicationStatus toStatus = ApplicationStatus.valueOf(to);

    assertThat(ApplicationStatusMachine.canTransition(fromStatus, toStatus)).isFalse();
  }

  // --- Same-state rejection ---

  @ParameterizedTest(name = "{0} → {0} should be rejected (same state)")
  @CsvSource({"PENDING", "REVIEWING", "INTERVIEWED", "ACCEPTED", "REJECTED"})
  void assertTransitionRejectsSameState(String status) {
    ApplicationStatus s = ApplicationStatus.valueOf(status);

    assertThatThrownBy(() -> ApplicationStatusMachine.assertTransition(s, s))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining(status);
  }

  // --- assertTransition throws on invalid ---

  @Test
  void assertTransitionThrowsOnInvalidTransition() {
    assertThatThrownBy(
            () -> ApplicationStatusMachine.assertTransition(ApplicationStatus.PENDING, ApplicationStatus.ACCEPTED))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("inválida");
  }

  // --- Triangulation: assertTransition succeeds on valid ---

  @Test
  void assertTransitionSucceedsOnValidTransition() {
    // Should NOT throw
    ApplicationStatusMachine.assertTransition(ApplicationStatus.PENDING, ApplicationStatus.REVIEWING);
    ApplicationStatusMachine.assertTransition(ApplicationStatus.INTERVIEWED, ApplicationStatus.REJECTED);
  }
}
