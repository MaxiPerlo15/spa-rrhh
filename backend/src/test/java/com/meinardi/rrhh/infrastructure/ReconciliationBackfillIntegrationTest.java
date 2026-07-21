package com.meinardi.rrhh.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;

class ReconciliationBackfillIntegrationTest {
  private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

  static {
    POSTGRES.start();
  }

  @BeforeEach
  void resetToEvidenceSchema() {
    Flyway flyway = flyway("4");
    flyway.clean();
    flyway.migrate();
  }

  @Test
  void backfillsApprovedMatchedAndResetRowsBeforeAddingTheTargetContract() throws Exception {
    seedLegacyUser("user-match", "match@example.com");
    seedRoleAndUser("user-reset", "reset@example.com");
    seedTarget("usuario-match", "match@example.com");
    seedSettings("settings-match", "user-match", false);
    seedSettings("settings-reset", "user-reset", false);
    seedEvidence("item-match", "settings-match", "user-match", "usuario-match", "MATCHED", "b".repeat(64), "a".repeat(64), "a".repeat(64), null);
    seedEvidence("item-reset", "settings-reset", "user-reset", "user-reset", "RESET_APPROVED", "b".repeat(64), "a".repeat(64), "a".repeat(64),
        "{\"notificationsEnabled\":false,\"notifyNewApplications\":true,\"notifyNewContacts\":false,\"notifySecurityAlerts\":true}");

    flyway(null).migrate();

    assertThat(value("SELECT \"usuarioId\" FROM \"AdminSettings\" WHERE \"id\" = 'settings-match'"))
        .isEqualTo("usuario-match");
    assertThat(value("SELECT \"usuarioId\" FROM \"AdminSettings\" WHERE \"id\" = 'settings-reset'"))
        .isEqualTo("user-reset");
    assertThat(value("SELECT \"notificationsEnabled\"::text FROM \"AdminSettings\" WHERE \"id\" = 'settings-match'"))
        .isEqualTo("false");
    assertThat(value("SELECT \"notificationsEnabled\"::text FROM \"AdminSettings\" WHERE \"id\" = 'settings-reset'"))
        .isEqualTo("false");
    assertThat(value("SELECT concat_ws(',', \"notifyNewApplications\"::text, \"notifyNewContacts\"::text, \"notifySecurityAlerts\"::text) FROM \"AdminSettings\" WHERE \"id\" = 'settings-reset'"))
        .isEqualTo("true,false,true");
    assertThat(value("SELECT count(*)::text FROM \"AdminSettings\""))
        .isEqualTo(value("SELECT count(DISTINCT \"usuarioId\")::text FROM \"AdminSettings\""));
    assertRejected("INSERT INTO \"AdminSettings\" (\"id\", \"userId\", \"usuarioId\", \"updatedAt\") VALUES ('missing-target', 'user-match', NULL, CURRENT_TIMESTAMP)");
    assertRejectedWithSqlState("INSERT INTO \"AdminSettings\" (\"id\", \"userId\", \"usuarioId\", \"updatedAt\") VALUES ('duplicate-target', 'user-match', 'user-reset', CURRENT_TIMESTAMP)", "23505");
    assertRejected("INSERT INTO \"AdminSettings\" (\"id\", \"userId\", \"usuarioId\", \"updatedAt\") VALUES ('unknown-target', 'user-match', 'unknown', CURRENT_TIMESTAMP)");
  }

  @Test
  void addsTheRunReportChecksumBeforeTheBackfillMigrationForExistingVersionThreeDatabases() throws Exception {
    assertThat(value("SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'reconciliation_runs' AND column_name = 'report_checksum')::text"))
        .isEqualTo("true");
  }

  @Test
  void upgradesValidVersionThreeEvidenceWithoutMutatingTheAppendOnlyRun() throws Exception {
    Flyway versionThree = flyway("3");
    versionThree.clean();
    versionThree.migrate();
    seedRoleAndUser("user-v3", "v3@example.com");
    seedSettings("settings-v3", "user-v3", true);
    seedVersionThreeMatchedEvidence("item-v3", "settings-v3", "user-v3", "f".repeat(64));
    assertRejected("UPDATE reconciliation_runs SET catalog_fingerprint = 'a' WHERE id = 'run-item-v3'");
    flyway(null).migrate();
    assertThat(value("SELECT \"usuarioId\" FROM \"AdminSettings\" WHERE \"id\" = 'settings-v3'"))
        .isEqualTo("user-v3");
    assertThat(value("SELECT report_checksum FROM reconciliation_run_report_checksums WHERE run_id = 'run-item-v3'"))
        .isEqualTo("f".repeat(64));
    assertThat(value("SELECT report_checksum IS NULL::text FROM reconciliation_runs WHERE id = 'run-item-v3'"))
        .isEqualTo("true");
    assertRejected("UPDATE reconciliation_runs SET report_checksum = 'a' WHERE id = 'run-item-v3'");
  }

  @Test
  void blocksVersionThreeEvidenceWhenApprovalsForOneRunDisagreeOnTheReportChecksum() throws Exception {
    Flyway versionThree = flyway("3");
    versionThree.clean();
    versionThree.migrate();
    seedRoleAndUser("user-v3-conflict", "v3-conflict@example.com");
    seedSettings("settings-v3-conflict", "user-v3-conflict", true);
    seedVersionThreeMatchedEvidence("item-v3-conflict", "settings-v3-conflict", "user-v3-conflict", "f".repeat(64));
    execute("INSERT INTO reconciliation_approvals SELECT 'approval-conflict', item_id, source_id, target_id, verifier_id, '" + "a".repeat(64) + "', created_at, status, normalized_email, prisma_user_id, admin_settings_hash, prisma_user_hash, usuario_hash, product_approver_id, reset_reason, reset_defaults FROM reconciliation_approvals WHERE id = 'approval-item-v3-conflict'");
    assertThatThrownBy(() -> flyway(null).migrate()).isNotNull();
  }
  @Test
  void blocksTheContractWhenAnyLegacySettingsRowIsUnresolved() throws Exception {
    seedRoleAndUser("user-unresolved", "unresolved@example.com");
    seedSettings("settings-unresolved", "user-unresolved", true);
    assertThatThrownBy(() -> flyway(null).migrate()).isNotNull();
  }

  @Test
  void rejectsApprovalChecksumsThatDifferFromTheAuthoritativeRunChecksum() throws Exception {
    seedRoleAndUser("user-one", "one@example.com");
    seedRoleAndUser("user-two", "two@example.com");
    seedSettings("settings-one", "user-one", true);
    seedSettings("settings-two", "user-two", true);
    seedEvidence("item-one", "settings-one", "user-one", "user-one", "MATCHED", "b".repeat(64), "b".repeat(64), "b".repeat(64), null);
    seedEvidence("item-two", "settings-two", "user-two", "user-two", "MATCHED", "c".repeat(64), "b".repeat(64), "c".repeat(64), null);
    assertThatThrownBy(() -> flyway(null).migrate()).isNotNull();
  }

  @Test
  void blocksTheContractWhenLiveAdminSettingsValuesDriftFromImmutableEvidence() throws Exception {
    seedRoleAndUser("user-drift", "drift@example.com");
    seedSettings("settings-drift", "user-drift", true);
    seedEvidence("item-drift", "settings-drift", "user-drift", "user-drift", "MATCHED", "d".repeat(64), "d".repeat(64), "d".repeat(64), null);
    execute("UPDATE \"AdminSettings\" SET \"notificationsEnabled\" = false WHERE \"id\" = 'settings-drift'");

    assertThatThrownBy(() -> flyway(null).migrate()).isNotNull();
  }

  @Test
  void blocksTheContractWhenLiveUserValuesDriftFromImmutableEvidence() throws Exception {
    seedRoleAndUser("user-drift", "drift@example.com");
    seedSettings("settings-drift", "user-drift", true);
    seedEvidence("item-drift", "settings-drift", "user-drift", "user-drift", "MATCHED", "d".repeat(64), "d".repeat(64), "d".repeat(64), null);
    execute("UPDATE \"User\" SET \"email\" = 'changed@example.com' WHERE \"id\" = 'user-drift'");

    assertThatThrownBy(() -> flyway(null).migrate()).isNotNull();
  }

  @Test
  void blocksTheContractWhenLiveUsuarioValuesDriftFromImmutableEvidence() throws Exception {
    seedRoleAndUser("user-drift", "drift@example.com");
    seedSettings("settings-drift", "user-drift", true);
    seedEvidence("item-drift", "settings-drift", "user-drift", "user-drift", "MATCHED", "d".repeat(64), "d".repeat(64), "d".repeat(64), null);
    execute("UPDATE usuario SET email = 'changed@example.com' WHERE id = 'user-drift'");

    assertThatThrownBy(() -> flyway(null).migrate()).isNotNull();
  }

  @Test
  void blocksTheContractWhenApprovedResetDefaultsAreMalformedOrUnrecognized() throws Exception {
    seedRoleAndUser("user-invalid-reset", "invalid-reset@example.com");
    seedSettings("settings-invalid-reset", "user-invalid-reset", false);
    seedEvidence("item-invalid-reset", "settings-invalid-reset", "user-invalid-reset", "user-invalid-reset", "RESET_APPROVED", "e".repeat(64), "e".repeat(64), "e".repeat(64),
        "{\"notificationsEnabled\":true,\"notifyNewApplications\":true,\"notifyNewContacts\":true,\"unknown\":true}");

    assertThatThrownBy(() -> flyway(null).migrate()).isNotNull();
  }

  private Flyway flyway(String target) {
    var configuration = Flyway.configure().dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
        .cleanDisabled(false);
    if (target != null) configuration.target(target);
    return configuration.load();
  }

  private void seedRoleAndUser(String id, String email) throws Exception {
    execute("INSERT INTO rol (id) VALUES ('role-" + id + "')");
    execute("INSERT INTO usuario (id, email, enabled, nombre_usuario, password, rol_id) VALUES ('" + id + "', '" + email + "', true, 'Admin', 'hash', 'role-" + id + "')");
    execute("INSERT INTO \"User\" (\"id\", \"email\", \"passwordHash\", \"role\", \"createdAt\", \"updatedAt\") VALUES ('" + id + "', '" + email + "', 'hash', 'ADMIN', '2026-07-13 00:00:00', '2026-07-13 00:00:00')");
  }

  private void seedLegacyUser(String id, String email) throws Exception {
    execute("INSERT INTO \"User\" (\"id\", \"email\", \"passwordHash\", \"role\", \"createdAt\", \"updatedAt\") VALUES ('" + id + "', '" + email + "', 'hash', 'ADMIN', '2026-07-13 00:00:00', '2026-07-13 00:00:00')");
  }

  private void seedTarget(String id, String email) throws Exception {
    execute("INSERT INTO rol (id) VALUES ('role-" + id + "')");
    execute("INSERT INTO usuario (id, email, enabled, nombre_usuario, password, rol_id) VALUES ('" + id + "', '" + email + "', true, 'Admin', 'hash', 'role-" + id + "')");
  }

  private void seedSettings(String id, String userId, boolean enabled) throws Exception {
    execute("INSERT INTO \"AdminSettings\" (\"id\", \"userId\", \"notificationsEnabled\", \"notifyNewApplications\", \"notifyNewContacts\", \"notifySecurityAlerts\", \"createdAt\", \"updatedAt\") VALUES ('" + id + "', '" + userId + "', " + enabled + ", " + enabled + ", " + enabled + ", " + enabled + ", '2026-07-13 00:00:00', '2026-07-13 00:00:00')");
  }

  private void seedEvidence(String itemId, String settingsId, String userId, String targetId, String status, String catalogFingerprint, String reportChecksum, String approvalChecksum, String defaults) throws Exception {
    String email = userId.replaceFirst("^user-", "") + "@example.com";
    boolean enabled = !(settingsId.contains("match") || settingsId.contains("reset"));
    String settings = "{\"createdAt\":\"2026-07-13T00:00:00.000Z\",\"id\":\"" + settingsId + "\",\"notificationsEnabled\":" + enabled + ",\"notifyNewApplications\":" + enabled + ",\"notifyNewContacts\":" + enabled + ",\"notifySecurityAlerts\":" + enabled + ",\"updatedAt\":\"2026-07-13T00:00:00.000Z\",\"userId\":\"" + userId + "\"}";
    String user = "{\"createdAt\":\"2026-07-13T00:00:00.000Z\",\"email\":\"" + email + "\",\"id\":\"" + userId + "\",\"name\":null,\"passwordHash\":\"hash\",\"role\":\"ADMIN\",\"updatedAt\":\"2026-07-13T00:00:00.000Z\"}";
    String usuario = "{\"email\":\"" + email + "\",\"enabled\":true,\"id\":\"" + targetId + "\",\"nombreUsuario\":\"Admin\",\"password\":\"hash\",\"passwordResetToken\":null,\"passwordResetTokenExpiry\":null,\"rolId\":\"role-" + targetId + "\"}";
    execute("INSERT INTO reconciliation_runs (id, catalog_fingerprint, report_checksum, created_at) VALUES ('run-" + itemId + "', '" + catalogFingerprint + "', '" + reportChecksum + "', CURRENT_TIMESTAMP)");
    execute("INSERT INTO reconciliation_items (id, run_id, admin_settings_id, admin_settings_snapshot, admin_settings_hash, prisma_user_id, prisma_user_snapshot, prisma_user_hash, usuario_id, usuario_snapshot, usuario_hash) VALUES ('" + itemId + "', 'run-" + itemId + "', '" + settingsId + "', '" + settings + "', '" + sha256(settings) + "', '" + userId + "', '" + user + "', '" + sha256(user) + "', '" + targetId + "', '" + usuario + "', '" + sha256(usuario) + "')");
    String target = status.equals("MATCHED") ? "'" + targetId + "'" : "NULL";
    String verifier = status.equals("MATCHED") ? "'verifier'" : "NULL";
    String reset = status.equals("RESET_APPROVED") ? "'product', 'approved reset', '" + defaults + "'" : "NULL, NULL, NULL";
    execute("INSERT INTO reconciliation_approvals (id, item_id, source_id, target_id, verifier_id, report_checksum, status, normalized_email, prisma_user_id, admin_settings_hash, prisma_user_hash, usuario_hash, product_approver_id, reset_reason, reset_defaults) VALUES ('approval-" + itemId + "', '" + itemId + "', '" + settingsId + "', " + target + ", " + verifier + ", '" + approvalChecksum + "', '" + status + "', '" + userId + "@example.com', '" + userId + "', '" + sha256(settings) + "', '" + sha256(user) + "', " + (status.equals("MATCHED") ? "'" + sha256(usuario) + "'" : "NULL") + ", " + reset + ")");
  }

  private void seedVersionThreeMatchedEvidence(String itemId, String settingsId, String userId, String checksum) throws Exception {
    String email = userId.replaceFirst("^user-", "") + "@example.com";
    String settings = "{\"createdAt\":\"2026-07-13T00:00:00.000Z\",\"id\":\"" + settingsId + "\",\"notificationsEnabled\":true,\"notifyNewApplications\":true,\"notifyNewContacts\":true,\"notifySecurityAlerts\":true,\"updatedAt\":\"2026-07-13T00:00:00.000Z\",\"userId\":\"" + userId + "\"}";
    String user = "{\"createdAt\":\"2026-07-13T00:00:00.000Z\",\"email\":\"" + email + "\",\"id\":\"" + userId + "\",\"name\":null,\"passwordHash\":\"hash\",\"role\":\"ADMIN\",\"updatedAt\":\"2026-07-13T00:00:00.000Z\"}";
    String usuario = "{\"email\":\"" + email + "\",\"enabled\":true,\"id\":\"" + userId + "\",\"nombreUsuario\":\"Admin\",\"password\":\"hash\",\"passwordResetToken\":null,\"passwordResetTokenExpiry\":null,\"rolId\":\"role-" + userId + "\"}";
    execute("INSERT INTO reconciliation_runs (id, catalog_fingerprint, created_at) VALUES ('run-" + itemId + "', '" + "e".repeat(64) + "', CURRENT_TIMESTAMP)");
    execute("INSERT INTO reconciliation_items (id, run_id, admin_settings_id, admin_settings_snapshot, admin_settings_hash, prisma_user_id, prisma_user_snapshot, prisma_user_hash, usuario_id, usuario_snapshot, usuario_hash) VALUES ('" + itemId + "', 'run-" + itemId + "', '" + settingsId + "', '" + settings + "', '" + sha256(settings) + "', '" + userId + "', '" + user + "', '" + sha256(user) + "', '" + userId + "', '" + usuario + "', '" + sha256(usuario) + "')");
    execute("INSERT INTO reconciliation_approvals (id, item_id, source_id, target_id, verifier_id, report_checksum, status, normalized_email, prisma_user_id, admin_settings_hash, prisma_user_hash, usuario_hash) VALUES ('approval-" + itemId + "', '" + itemId + "', '" + settingsId + "', '" + userId + "', 'verifier', '" + checksum + "', 'MATCHED', '" + email + "', '" + userId + "', '" + sha256(settings) + "', '" + sha256(user) + "', '" + sha256(usuario) + "')");
  }

  private void assertRejected(String sql) {
    assertThatThrownBy(() -> execute(sql)).isNotNull();
  }

  private void assertRejectedWithSqlState(String sql, String sqlState) {
    assertThatThrownBy(() -> execute(sql))
        .isInstanceOf(SQLException.class)
        .extracting(throwable -> ((SQLException) throwable).getSQLState())
        .isEqualTo(sqlState);
  }

  private String value(String sql) throws Exception {
    try (Connection connection = connection(); Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
      result.next();
      return result.getString(1);
    }
  }

  private void execute(String sql) throws Exception {
    try (Connection connection = connection(); Statement statement = connection.createStatement()) {
      statement.executeUpdate(sql);
    }
  }

  private Connection connection() throws Exception {
    return DriverManager.getConnection(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
  }

  private String sha256(String value) throws Exception {
    return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
  }
}
