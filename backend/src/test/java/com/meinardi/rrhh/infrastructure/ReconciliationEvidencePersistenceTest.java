package com.meinardi.rrhh.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.meinardi.rrhh.domain.model.ReconciliationApproval;
import com.meinardi.rrhh.domain.model.ReconciliationItem;
import com.meinardi.rrhh.domain.model.ReconciliationRun;
import com.meinardi.rrhh.application.AdminSettingsReconciliationService;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.List;
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
    approvals.save(ReconciliationApproval.verifiedMatch(
        "approval-evidence", item, "settings-1", "user-1", "usuario-1", "admin@example.com",
        item.getAdminSettingsHash(), item.getPrismaUserHash(), item.getUsuarioHash(), "verifier-1", "e".repeat(64), Instant.EPOCH));

    assertThat(runs.findById(run.getId()).orElseThrow().getCatalogFingerprint()).isEqualTo("a".repeat(64));
    ReconciliationItem persisted = items.findById(item.getId()).orElseThrow();
    assertThat(persisted.getAdminSettingsSnapshot()).isEqualTo("{\"createdAt\":\"2026-07-13T00:00:00Z\",\"id\":\"settings-1\",\"notificationsEnabled\":true,\"notifyNewApplications\":true,\"notifyNewContacts\":true,\"notifySecurityAlerts\":true,\"updatedAt\":\"2026-07-13T00:00:00Z\",\"userId\":\"user-1\"}");
    assertThat(persisted.getAdminSettingsHash()).isEqualTo(sha256(persisted.getAdminSettingsSnapshot()));
    assertThat(persisted.getPrismaUserHash()).isEqualTo(sha256(persisted.getPrismaUserSnapshot()));
    assertThat(persisted.getUsuarioHash()).isEqualTo(sha256(persisted.getUsuarioSnapshot()));
    assertThat(approvals.findById("approval-evidence").orElseThrow().getReportChecksum())
        .isEqualTo("e".repeat(64));
    ReconciliationApproval matched = approvals.findById("approval-evidence").orElseThrow();
    assertThat(matched.getNormalizedEmail()).isEqualTo("admin@example.com");
    assertThat(matched.getAdminSettingsHash()).isEqualTo(item.getAdminSettingsHash());
    assertThat(matched.getPrismaUserHash()).isEqualTo(item.getPrismaUserHash());
    assertThat(matched.getUsuarioHash()).isEqualTo(item.getUsuarioHash());
  }

  @Test
  void rejectsUpdatesAndDeletesForEveryEvidenceTable() throws Exception {
    ReconciliationRun run =
        runs.save(new ReconciliationRun("run-immutable", "f".repeat(64), Instant.parse("2026-07-13T00:00:01Z")));
    ReconciliationItem item =
        items.save(ReconciliationItem.fromSnapshots("item-immutable", run,
            settings("settings-2", "user-2", false), user("user-2", "immutable@example.com"), usuario("usuario-2", "immutable@example.com", true)));
    approvals.save(ReconciliationApproval.verifiedMatch("approval-immutable", item, "settings-2", "user-2", "usuario-2", "immutable@example.com",
        item.getAdminSettingsHash(), item.getPrismaUserHash(), item.getUsuarioHash(), "verifier-2", "4".repeat(64), Instant.EPOCH));

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

  @Test
  void persistsImmutableProductResetApprovalWithCompleteEvidenceBinding() {
    ReconciliationRun run = runs.save(new ReconciliationRun("run-reset", "6".repeat(64), Instant.EPOCH));
    ReconciliationItem item = items.save(ReconciliationItem.fromSnapshots("item-reset", run,
        settings("settings-reset", "user-reset", false), user("user-reset", "reset@example.com"), usuario("usuario-reset", "reset@example.com", true)));
    var service = new AdminSettingsReconciliationService();
    var approval = service.approveReset(service.candidate(
        new AdminSettingsReconciliationService.Source("settings-reset", "user-reset", "reset@example.com", item.getAdminSettingsHash(), item.getPrismaUserHash()),
        List.of(), "c".repeat(64)), "product-1", "legacy account unavailable", "notifications disabled", "c".repeat(64), Instant.EPOCH);

    approvals.save(ReconciliationApproval.productReset("approval-reset", item,
        approval.source().adminSettingsId(), approval.source().prismaUserId(), approval.normalizedEmail(),
        approval.source().adminSettingsHash(), approval.source().prismaUserHash(), approval.productApproverId(),
        approval.reason(), approval.defaults(), approval.reportChecksum(), approval.approvedAt()));

    ReconciliationApproval persisted = approvals.findById("approval-reset").orElseThrow();
    assertThat(persisted.getStatus()).isEqualTo("RESET_APPROVED");
    assertThat(persisted.getProductApproverId()).isEqualTo("product-1");
    assertThat(persisted.getReason()).isEqualTo("legacy account unavailable");
    assertThat(persisted.getDefaults()).isEqualTo("notifications disabled");
    assertThat(persisted.getNormalizedEmail()).isEqualTo("reset@example.com");
    assertThat(persisted.getAdminSettingsHash()).isEqualTo(item.getAdminSettingsHash());
    assertThat(persisted.getPrismaUserHash()).isEqualTo(item.getPrismaUserHash());
    assertThat(persisted.getPrismaUserId()).isEqualTo("user-reset");
    assertThat(persisted.getReportChecksum()).isEqualTo("c".repeat(64));
    assertThat(persisted.getCreatedAt()).isEqualTo(Instant.EPOCH);
    assertRejected("UPDATE reconciliation_approvals SET reset_reason = 'changed' WHERE id = 'approval-reset'");
  }

  @Test
  void rejectsIncompleteStatusDependentApprovalsAtThePostgresBoundary() {
    ReconciliationRun run = runs.save(new ReconciliationRun("run-constraints", "7".repeat(64), Instant.EPOCH));
    ReconciliationItem item = items.save(ReconciliationItem.fromSnapshots("item-constraints", run,
        settings("settings-constraints", "user-constraints", true), user("user-constraints", "constraints@example.com"), usuario("usuario-constraints", "constraints@example.com", true)));

    assertDatabaseRejected("INSERT INTO reconciliation_approvals (id, item_id, source_id, prisma_user_id, target_id, verifier_id, report_checksum, status, admin_settings_hash, prisma_user_hash, usuario_hash) VALUES ('missing-email', 'item-constraints', 'settings-constraints', 'user-constraints', 'usuario-constraints', 'verifier', '" + "8".repeat(64) + "', 'MATCHED', '" + item.getAdminSettingsHash() + "', '" + item.getPrismaUserHash() + "', '" + item.getUsuarioHash() + "')");
    assertDatabaseRejected("INSERT INTO reconciliation_approvals (id, item_id, source_id, prisma_user_id, report_checksum, status, normalized_email, admin_settings_hash, prisma_user_hash) VALUES ('missing-reset-approval', 'item-constraints', 'settings-constraints', 'user-constraints', '" + "8".repeat(64) + "', 'RESET_APPROVED', 'constraints@example.com', '" + item.getAdminSettingsHash() + "', '" + item.getPrismaUserHash() + "')");
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
