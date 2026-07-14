package com.meinardi.rrhh.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.meinardi.rrhh.domain.model.ReconciliationApproval;
import com.meinardi.rrhh.domain.model.ReconciliationItem;
import com.meinardi.rrhh.domain.model.ReconciliationRun;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

@SpringBootTest(
    properties = {
      "spring.flyway.enabled=true",
      "spring.jpa.hibernate.ddl-auto=validate",
      "spring.datasource.driver-class-name=org.postgresql.Driver",
      "rrhh.security.internal-api-token=test-token"
    })
class ReconciliationEvidencePersistenceTest {

  private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

  static {
    POSTGRES.start();
  }

  @DynamicPropertySource
  static void databaseProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
  }

  @Autowired private DataSource dataSource;
  @Autowired private ReconciliationRunRepository runs;
  @Autowired private ReconciliationItemRepository items;
  @Autowired private ReconciliationApprovalRepository approvals;

  @Test
  void persistsCanonicalBytesAndHashesBoundToCompleteSourceSnapshots() throws Exception {
    ReconciliationRun run =
        runs.save(new ReconciliationRun("run-evidence", "a".repeat(64), Instant.parse("2026-07-13T00:00:00Z")));
    ReconciliationItem item =
        items.save(
            ReconciliationItem.fromSnapshots(
                "item-evidence", run,
                settings("settings-1", "user-1", true), user("user-1", "admin@example.com"), usuario("usuario-1", "admin@example.com", true)));
    approvals.save(
        new ReconciliationApproval(
            "approval-evidence", item, "settings-1", "usuario-1", "verifier-1", "e".repeat(64)));

    assertThat(runs.findById(run.getId()).orElseThrow().getCatalogFingerprint()).isEqualTo("a".repeat(64));
    ReconciliationItem persisted = items.findById(item.getId()).orElseThrow();
    assertThat(persisted.getAdminSettingsSnapshot()).isEqualTo("{\"createdAt\":\"2026-07-13T00:00:00Z\",\"id\":\"settings-1\",\"notificationsEnabled\":true,\"notifyNewApplications\":true,\"notifyNewContacts\":true,\"notifySecurityAlerts\":true,\"updatedAt\":\"2026-07-13T00:00:00Z\",\"userId\":\"user-1\"}");
    assertThat(persisted.getAdminSettingsHash()).isEqualTo(sha256(persisted.getAdminSettingsSnapshot()));
    assertThat(persisted.getPrismaUserHash()).isEqualTo(sha256(persisted.getPrismaUserSnapshot()));
    assertThat(persisted.getUsuarioHash()).isEqualTo(sha256(persisted.getUsuarioSnapshot()));
    assertThat(approvals.findById("approval-evidence").orElseThrow().getReportChecksum())
        .isEqualTo("e".repeat(64));
  }

  @Test
  void rejectsUpdatesAndDeletesForEveryEvidenceTable() throws Exception {
    ReconciliationRun run =
        runs.save(new ReconciliationRun("run-immutable", "f".repeat(64), Instant.parse("2026-07-13T00:00:01Z")));
    ReconciliationItem item =
        items.save(ReconciliationItem.fromSnapshots("item-immutable", run,
            settings("settings-2", "user-2", false), user("user-2", "immutable@example.com"), usuario("usuario-2", "immutable@example.com", true)));
    approvals.save(new ReconciliationApproval("approval-immutable", item, "settings-2", "usuario-2", "verifier-2", "4".repeat(64)));

    assertRejected("UPDATE reconciliation_runs SET catalog_fingerprint = 'changed' WHERE id = 'run-immutable'");
    assertRejected("DELETE FROM reconciliation_runs WHERE id = 'run-immutable'");
    assertRejected("UPDATE reconciliation_items SET admin_settings_id = 'changed' WHERE id = 'item-immutable'");
    assertRejected("DELETE FROM reconciliation_items WHERE id = 'item-immutable'");
    assertRejected("UPDATE reconciliation_approvals SET verifier_id = 'changed' WHERE id = 'approval-immutable'");
    assertRejected("DELETE FROM reconciliation_approvals WHERE id = 'approval-immutable'");
    assertRejected("TRUNCATE reconciliation_runs, reconciliation_items, reconciliation_approvals");
  }

  @Test
  void rejectsIncompleteSnapshotsMalformedJsonAndArbitraryHashes() throws Exception {
    ReconciliationRun run =
        runs.save(new ReconciliationRun("run-second", "5".repeat(64), Instant.parse("2026-07-13T00:00:02Z")));
    assertThatThrownBy(() -> ReconciliationItem.fromSnapshots("item-incomplete", run, "{}",
            user("user-3", "second@example.com"), usuario("usuario-3", "second@example.com", false)))
        .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("complete");
    assertThatThrownBy(() -> ReconciliationItem.fromSnapshots("item-malformed", run, "{",
            user("user-3", "second@example.com"), usuario("usuario-3", "second@example.com", false)))
        .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("JSON");
    assertDatabaseRejected("INSERT INTO reconciliation_items (id, run_id, admin_settings_id, admin_settings_snapshot, admin_settings_hash, prisma_user_id, prisma_user_snapshot, prisma_user_hash, usuario_id, usuario_snapshot, usuario_hash) VALUES ('item-hash', 'run-second', 'settings-3', '{}', 'not-a-hash', 'user-3', '{}', 'not-a-hash', 'usuario-3', '{}', 'not-a-hash')");
  }

  private void assertRejected(String sql) {
    assertThatThrownBy(() -> execute(sql)).hasMessageContaining("append-only");
  }
  private void assertDatabaseRejected(String sql) { assertThatThrownBy(() -> execute(sql)).isNotNull(); }

  private void execute(String sql) throws Exception {
    try (Connection connection = dataSource.getConnection(); PreparedStatement statement = connection.prepareStatement(sql)) {
      statement.executeUpdate();
    }
  }

  private String sha256(String value) throws Exception {
    return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
  }

  private String settings(String id, String userId, boolean enabled) { return String.format("{\"updatedAt\":\"2026-07-13T00:00:00Z\",\"userId\":\"%s\",\"notifySecurityAlerts\":true,\"notificationsEnabled\":%s,\"notifyNewContacts\":true,\"notifyNewApplications\":true,\"id\":\"%s\",\"createdAt\":\"2026-07-13T00:00:00Z\"}", userId, enabled, id); }
  private String user(String id, String email) { return String.format("{\"updatedAt\":\"2026-07-13T00:00:00Z\",\"role\":\"ADMIN\",\"passwordHash\":\"hash\",\"name\":null,\"id\":\"%s\",\"email\":\"%s\",\"createdAt\":\"2026-07-13T00:00:00Z\"}", id, email); }
  private String usuario(String id, String email, boolean enabled) { return String.format("{\"rolId\":\"role-1\",\"passwordResetTokenExpiry\":null,\"passwordResetToken\":null,\"password\":\"hash\",\"nombreUsuario\":\"Admin\",\"id\":\"%s\",\"enabled\":%s,\"email\":\"%s\"}", id, enabled, email); }
}
