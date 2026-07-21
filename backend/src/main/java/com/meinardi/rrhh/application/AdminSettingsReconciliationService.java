package com.meinardi.rrhh.application;

import java.text.Normalizer;
import java.time.Instant;
import java.util.List;
import java.util.Locale;

/** Creates checksum-bound reconciliation decisions from immutable evidence snapshots. */
public class AdminSettingsReconciliationService {
  public enum Status { MATCHED, UNMATCHED, DUPLICATE, RESET_APPROVED }

  public Candidate candidate(Source source, List<Target> targets, String reportChecksum) {
    requireEvidence(source, reportChecksum);
    String email = normalize(source.email());
    if (email == null) return new Candidate(Status.UNMATCHED, source, null, null, reportChecksum);

    List<Target> matches = targets.stream().filter(target -> email.equals(normalize(target.email()))).toList();
    if (matches.size() != 1) {
      return new Candidate(matches.size() > 1 ? Status.DUPLICATE : Status.UNMATCHED, source, null, email, reportChecksum);
    }
    // Exact equality only proposes a mapping; it is never verification by itself.
    return new Candidate(Status.UNMATCHED, source, matches.getFirst(), email, reportChecksum);
  }

  public Approval approveMatch(Candidate candidate, String verifierId, String reportChecksum, Instant approvedAt) {
    requireChecksum(candidate.reportChecksum(), reportChecksum);
    if (candidate.status() != Status.UNMATCHED || candidate.target() == null || blank(verifierId) || approvedAt == null) {
      throw new IllegalArgumentException("a verifier may only approve an equality candidate");
    }
    requireTarget(candidate.target());
    return new Approval(Status.MATCHED, candidate.source(), candidate.target(), candidate.normalizedEmail(), verifierId,
        null, null, null, approvedAt, reportChecksum);
  }

  public Approval approveReset(Candidate candidate, String productApproverId, String reason, String defaults,
      String reportChecksum, Instant approvedAt) {
    requireChecksum(candidate.reportChecksum(), reportChecksum);
    if (candidate.status() == Status.MATCHED || blank(productApproverId) || blank(reason) || defaults == null || approvedAt == null) {
      throw new IllegalArgumentException("a reset requires product approver, reason, defaults, and time");
    }
    return new Approval(Status.RESET_APPROVED, candidate.source(), candidate.target(), candidate.normalizedEmail(), null,
        productApproverId, reason, defaults, approvedAt, reportChecksum);
  }

  private void requireEvidence(Source source, String checksum) {
    if (source == null || blank(source.adminSettingsId()) || blank(source.prismaUserId())
        || !hash(source.adminSettingsHash()) || !hash(source.prismaUserHash())) {
      throw new IllegalArgumentException("source evidence must include IDs, email, and hashes");
    }
    requireChecksum(checksum, checksum);
  }

  private void requireChecksum(String expected, String actual) {
    if (!hash(expected) || !expected.equals(actual)) throw new IllegalArgumentException("report checksum changed or is invalid");
  }

  private String normalize(String email) {
    if (email == null) return null;
    String normalized = Normalizer.normalize(email, Normalizer.Form.NFKC).trim().toLowerCase(Locale.ROOT);
    int at = normalized.indexOf('@');
    return normalized.isEmpty() || at <= 0 || normalized.substring(0, at).contains("+") ? null : normalized;
  }

  private boolean hash(String value) { return value != null && value.matches("[0-9a-f]{64}"); }
  private boolean blank(String value) { return value == null || value.isBlank(); }

  private void requireTarget(Target target) {
    if (blank(target.usuarioId()) || !hash(target.usuarioHash())) {
      throw new IllegalArgumentException("target evidence must include ID and hash");
    }
  }

  public record Source(String adminSettingsId, String prismaUserId, String email, String adminSettingsHash, String prismaUserHash) {}
  public record Target(String usuarioId, String email, String usuarioHash) {}
  public record Candidate(Status status, Source source, Target target, String normalizedEmail, String reportChecksum) {}
  public record Approval(Status status, Source source, Target target, String normalizedEmail, String verifierId,
      String productApproverId, String reason, String defaults, Instant approvedAt, String reportChecksum) {}
}
