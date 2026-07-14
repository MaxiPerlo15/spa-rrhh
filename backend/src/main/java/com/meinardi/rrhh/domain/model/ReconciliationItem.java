package com.meinardi.rrhh.domain.model;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.json.JsonMapper;
import jakarta.persistence.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

@Entity
@Table(name = "reconciliation_items")
public class ReconciliationItem {
  @Id private String id;
  @ManyToOne(optional = false) @JoinColumn(name = "run_id") private ReconciliationRun run;
  @Column(nullable = false) private String adminSettingsId;
  @Column(nullable = false) private String adminSettingsSnapshot;
  @Column(nullable = false) private String adminSettingsHash;
  @Column(nullable = false) private String prismaUserId;
  @Column(nullable = false) private String prismaUserSnapshot;
  @Column(nullable = false) private String prismaUserHash;
  @Column(nullable = false) private String usuarioId;
  @Column(nullable = false) private String usuarioSnapshot;
  @Column(nullable = false) private String usuarioHash;

  protected ReconciliationItem() {}
  public ReconciliationItem(String id, ReconciliationRun run, String adminSettingsId, String adminSettingsSnapshot,
      String adminSettingsHash, String prismaUserId, String prismaUserSnapshot, String prismaUserHash,
      String usuarioId, String usuarioSnapshot, String usuarioHash) {
    this.id = id; this.run = run; this.adminSettingsId = adminSettingsId; this.adminSettingsSnapshot = adminSettingsSnapshot;
    this.adminSettingsHash = adminSettingsHash; this.prismaUserId = prismaUserId; this.prismaUserSnapshot = prismaUserSnapshot;
    this.prismaUserHash = prismaUserHash; this.usuarioId = usuarioId; this.usuarioSnapshot = usuarioSnapshot; this.usuarioHash = usuarioHash;
  }
  public static ReconciliationItem fromSnapshots(String id, ReconciliationRun run, String settings, String user, String usuario) {
    Snapshot a = snapshot("AdminSettings", settings, Set.of("id", "userId", "notificationsEnabled", "notifyNewApplications", "notifyNewContacts", "notifySecurityAlerts", "createdAt", "updatedAt"));
    Snapshot u = snapshot("User", user, Set.of("id", "email", "name", "passwordHash", "role", "createdAt", "updatedAt"));
    Snapshot t = snapshot("Usuario", usuario, Set.of("id", "email", "enabled", "nombreUsuario", "password", "passwordResetToken", "passwordResetTokenExpiry", "rolId"));
    return new ReconciliationItem(id, run, a.id, a.json, a.hash, u.id, u.json, u.hash, t.id, t.json, t.hash);
  }
  private static Snapshot snapshot(String type, String value, Set<String> keys) {
    try {
      JsonNode node = JsonMapper.builder().build().readTree(value);
      Set<String> actual = new HashSet<>(); node.fieldNames().forEachRemaining(actual::add);
      if (!node.isObject() || !actual.equals(keys) || !node.path("id").isTextual() || node.path("id").asText().isBlank())
        throw new IllegalArgumentException(type + " snapshot must be complete");
      TreeMap<String, JsonNode> canonical = new TreeMap<>(); node.fields().forEachRemaining(entry -> canonical.put(entry.getKey(), entry.getValue()));
      String json = JsonMapper.builder().build().writeValueAsString(canonical);
      return new Snapshot(node.path("id").asText(), json, java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(json.getBytes(StandardCharsets.UTF_8))));
    } catch (IllegalArgumentException exception) { throw exception;
    } catch (Exception exception) { throw new IllegalArgumentException(type + " snapshot must be valid JSON", exception); }
  }
  private record Snapshot(String id, String json, String hash) {}
  public String getId() { return id; }
  public String getAdminSettingsSnapshot() { return adminSettingsSnapshot; }
  public String getAdminSettingsHash() { return adminSettingsHash; }
  public String getPrismaUserSnapshot() { return prismaUserSnapshot; }
  public String getPrismaUserHash() { return prismaUserHash; }
  public String getUsuarioSnapshot() { return usuarioSnapshot; }
  public String getUsuarioHash() { return usuarioHash; }
}
