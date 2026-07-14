package com.meinardi.rrhh.domain.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "reconciliation_approvals")
public class ReconciliationApproval {
  @Id private String id;
  @ManyToOne(optional = false) @JoinColumn(name = "item_id") private ReconciliationItem item;
  @Column(nullable = false) private String sourceId;
  @Column(nullable = false) private String targetId;
  @Column(nullable = false) private String verifierId;
  @Column(nullable = false) private String reportChecksum;
  @Column(nullable = false) private Instant createdAt = Instant.now();

  protected ReconciliationApproval() {}
  public ReconciliationApproval(String id, ReconciliationItem item, String sourceId, String targetId, String verifierId, String reportChecksum) {
    this.id = id; this.item = item; this.sourceId = sourceId; this.targetId = targetId;
    this.verifierId = verifierId; this.reportChecksum = reportChecksum;
  }
  public String getReportChecksum() { return reportChecksum; }
}
