package com.meinardi.rrhh.domain.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "reconciliation_approvals")
public class ReconciliationApproval {
  @Id private String id;
  @ManyToOne(optional = false) @JoinColumn(name = "item_id") private ReconciliationItem item;
  @Column(nullable = false) private String sourceId;
  private String targetId;
  private String verifierId;
  @Column(nullable = false) private String reportChecksum;
  @Column(nullable = false) private Instant createdAt = Instant.now();
  @Column(nullable = false) private String status = "MATCHED";
  private String normalizedEmail;
  @Column(nullable = false) private String prismaUserId;
  private String adminSettingsHash;
  private String prismaUserHash;
  private String usuarioHash;
  private String productApproverId;
  @Column(name = "reset_reason") private String reason;
  @Column(name = "reset_defaults") private String defaults;

  protected ReconciliationApproval() {}
  public ReconciliationApproval(String id, ReconciliationItem item, String sourceId, String targetId, String verifierId, String reportChecksum) {
    this.id = id; this.item = item; this.sourceId = sourceId; this.targetId = targetId;
    this.verifierId = verifierId; this.reportChecksum = reportChecksum;
  }
  public static ReconciliationApproval verifiedMatch(String id, ReconciliationItem item, String settingsId, String userId,
      String targetId, String email, String settingsHash, String userHash, String targetHash, String verifier, String checksum, Instant approvedAt) {
    ReconciliationApproval approval = new ReconciliationApproval(id, item, settingsId, targetId, verifier, checksum);
    approval.prismaUserId = userId; approval.normalizedEmail = email; approval.adminSettingsHash = settingsHash;
    approval.prismaUserHash = userHash; approval.usuarioHash = targetHash; approval.createdAt = approvedAt;
    return approval;
  }
  public static ReconciliationApproval productReset(String id, ReconciliationItem item, String settingsId, String userId,
      String email, String settingsHash, String userHash, String approver, String reason, String defaults, String checksum, Instant approvedAt) {
    ReconciliationApproval approval = new ReconciliationApproval(id, item, settingsId, null, null, checksum);
    approval.status = "RESET_APPROVED"; approval.normalizedEmail = email; approval.adminSettingsHash = settingsHash;
    approval.prismaUserId = userId; approval.prismaUserHash = userHash; approval.productApproverId = approver; approval.reason = reason;
    approval.defaults = defaults; approval.createdAt = approvedAt;
    return approval;
  }
  public String getReportChecksum() { return reportChecksum; }
  public Instant getCreatedAt() { return createdAt; }
  public String getStatus() { return status; }
  public String getNormalizedEmail() { return normalizedEmail; }
  public String getAdminSettingsHash() { return adminSettingsHash; }
  public String getPrismaUserHash() { return prismaUserHash; }
  public String getUsuarioHash() { return usuarioHash; }
  public String getPrismaUserId() { return prismaUserId; }
  public String getProductApproverId() { return productApproverId; }
  public String getReason() { return reason; }
  public String getDefaults() { return defaults; }
}
