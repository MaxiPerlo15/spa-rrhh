package com.meinardi.rrhh.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import org.junit.jupiter.api.Test;

class AdminSettingsReconciliationServiceTest {
  private final AdminSettingsReconciliationService service = new AdminSettingsReconciliationService();

  @Test
  void normalizesNfkcWhitespaceAndLocaleIndependentCaseBeforeVerifierApproval() {
    var source = source(" ＡＤＭＩＮ@Example.COM ");
    var target = target("usuario-1", "admin@example.com");
    var candidate = service.candidate(source, List.of(target), checksum());

    assertThat(candidate.status()).isEqualTo(AdminSettingsReconciliationService.Status.UNMATCHED);
    var mapping = service.approveMatch(candidate, "verifier-1", checksum(), Instant.parse("2026-07-13T00:00:00Z"));

    assertThat(mapping.status()).isEqualTo(AdminSettingsReconciliationService.Status.MATCHED);
    assertThat(mapping.normalizedEmail()).isEqualTo("admin@example.com");
    assertThat(mapping.verifierId()).isEqualTo("verifier-1");
    assertThat(mapping.approvedAt()).isEqualTo(Instant.parse("2026-07-13T00:00:00Z"));
  }

  @Test
  void ignoresTheTurkishDefaultLocaleWhenNormalizingEmail() {
    Locale previous = Locale.getDefault();
    Locale.setDefault(Locale.forLanguageTag("tr-TR"));
    try {
      var candidate = service.candidate(source("I@EXAMPLE.COM"), List.of(target("usuario-1", "i@example.com")), checksum());

      assertThat(candidate.target()).isNotNull();
      assertThat(candidate.normalizedEmail()).isEqualTo("i@example.com");
    } finally {
      Locale.setDefault(previous);
    }
  }

  @Test
  void rejectsEmptyAndSameBasePlusAliasCandidatesAndClassifiesDuplicateTargets() {
    assertThat(service.candidate(source("  "), List.of(target("usuario-1", "admin@example.com")), checksum()).status())
        .isEqualTo(AdminSettingsReconciliationService.Status.UNMATCHED);
    var alias = service.candidate(source("admin+legacy@example.com"), List.of(target("usuario-1", "admin+legacy@example.com")), checksum());
    assertThat(alias.target()).isNull();
    assertThatThrownBy(() -> service.approveMatch(alias, "verifier-1", checksum(), Instant.EPOCH))
        .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("verifier");
    assertThat(service.candidate(source("admin@example.com"), List.of(target("usuario-1", "admin@example.com"), target("usuario-2", " ADMIN@example.com ")), checksum()).status())
        .isEqualTo(AdminSettingsReconciliationService.Status.DUPLICATE);
  }

  @Test
  void rejectsInvalidTargetEvidenceBeforeVerifierApprovalCanMatch() {
    var candidate = service.candidate(source("admin@example.com"), List.of(new AdminSettingsReconciliationService.Target("", "admin@example.com", "bad")), checksum());

    assertThatThrownBy(() -> service.approveMatch(candidate, "verifier-1", checksum(), Instant.EPOCH))
        .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("target evidence");
  }

  @Test
  void bindsChecksumForVerifierAndProductApprovedReset() {
    var candidate = service.candidate(source("missing@example.com"), List.of(), checksum());

    assertThatThrownBy(() -> service.approveMatch(candidate, "verifier-1", "f".repeat(64), Instant.EPOCH))
        .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("checksum");
    assertThatThrownBy(() -> service.approveReset(candidate, "product-1", "legacy account unavailable", "notifications disabled", "f".repeat(64), Instant.EPOCH))
        .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("checksum");
    var reset = service.approveReset(candidate, "product-1", "legacy account unavailable", "notifications disabled", checksum(), Instant.EPOCH);

    assertThat(reset.status()).isEqualTo(AdminSettingsReconciliationService.Status.RESET_APPROVED);
    assertThat(reset.productApproverId()).isEqualTo("product-1");
    assertThat(reset.reason()).isEqualTo("legacy account unavailable");
    assertThat(reset.defaults()).isEqualTo("notifications disabled");
    assertThat(reset.source().adminSettingsHash()).isEqualTo("a".repeat(64));
    assertThat(reset.source().prismaUserHash()).isEqualTo("b".repeat(64));
    assertThat(reset.reportChecksum()).isEqualTo(checksum());
  }

  private AdminSettingsReconciliationService.Source source(String email) {
    return new AdminSettingsReconciliationService.Source("settings-1", "user-1", email, "a".repeat(64), "b".repeat(64));
  }

  private AdminSettingsReconciliationService.Target target(String id, String email) {
    return new AdminSettingsReconciliationService.Target(id, email, "c".repeat(64));
  }

  private String checksum() { return "d".repeat(64); }
}
