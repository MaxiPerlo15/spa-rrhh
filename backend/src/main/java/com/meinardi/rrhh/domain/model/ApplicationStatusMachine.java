package com.meinardi.rrhh.domain.model;

import java.util.Map;

public class ApplicationStatusMachine {

  private static final Map<ApplicationStatus, ApplicationStatus[]> TRANSITIONS =
      Map.of(
          ApplicationStatus.PENDING, new ApplicationStatus[] {ApplicationStatus.REVIEWING, ApplicationStatus.REJECTED},
          ApplicationStatus.REVIEWING, new ApplicationStatus[] {ApplicationStatus.INTERVIEWED, ApplicationStatus.REJECTED},
          ApplicationStatus.INTERVIEWED, new ApplicationStatus[] {ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED},
          ApplicationStatus.ACCEPTED, new ApplicationStatus[] {},
          ApplicationStatus.REJECTED, new ApplicationStatus[] {});

  public static boolean canTransition(ApplicationStatus from, ApplicationStatus to) {
    ApplicationStatus[] allowed = TRANSITIONS.get(from);
    if (allowed == null) {
      return false;
    }
    for (ApplicationStatus s : allowed) {
      if (s == to) {
        return true;
      }
    }
    return false;
  }

  public static void assertTransition(ApplicationStatus from, ApplicationStatus to) {
    if (from == to) {
      throw new IllegalStateException("La postulación ya se encuentra en estado " + to);
    }
    if (!canTransition(from, to)) {
      throw new IllegalStateException("Transición inválida de postulación: " + from + " -> " + to);
    }
  }
}
