package com.meinardi.rrhh.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "reconciliation_runs")
public class ReconciliationRun {
  @Id private String id;
  @Column(nullable = false) private String catalogFingerprint;
  @Column(nullable = false) private String reportChecksum;
  @Column(nullable = false) private Instant createdAt;

  protected ReconciliationRun() {}
  public ReconciliationRun(String id, String catalogFingerprint, String reportChecksum, Instant createdAt) {
    this.id = id;
    this.catalogFingerprint = catalogFingerprint;
    this.reportChecksum = reportChecksum;
    this.createdAt = createdAt;
  }
  public String getId() { return id; }
  public String getCatalogFingerprint() { return catalogFingerprint; }
  public String getReportChecksum() { return reportChecksum; }
}
