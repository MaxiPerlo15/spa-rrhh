package com.meinardi.rrhh.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import com.meinardi.rrhh.application.AdminSettingsService;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

@SpringBootTest(properties = {"spring.flyway.enabled=true", "spring.jpa.hibernate.ddl-auto=validate", "spring.datasource.driver-class-name=org.postgresql.Driver", "rrhh.security.internal-api-token=test-token"})
class AdminSettingsServiceIntegrationTest {
  private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");
  static { POSTGRES.start(); }
  @DynamicPropertySource static void database(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
  }

  @Autowired private AdminSettingsService service;
  @Autowired private JdbcTemplate jdbc;

  @BeforeEach void seed() {
    jdbc.update("DELETE FROM \"AdminSettings\"");
    jdbc.update("DELETE FROM usuario");
    jdbc.update("DELETE FROM rol_permiso");
    jdbc.update("DELETE FROM rol");
    jdbc.update("INSERT INTO rol (id, nombre, descripcion) VALUES ('role-1', 'ADMIN', 'Admin')");
    jdbc.update("INSERT INTO usuario (id, email, password, nombre_usuario, rol_id, enabled) VALUES ('admin-1', 'admin@example.com', 'hash', 'Admin', 'role-1', true)");
    jdbc.update("INSERT INTO \"User\" (\"id\", \"email\", \"passwordHash\", \"role\", \"updatedAt\") VALUES ('legacy-1', 'admin@example.com', 'hash', CAST('ADMIN' AS \"Role\"), CURRENT_TIMESTAMP)");
    jdbc.update("INSERT INTO \"AdminSettings\" (\"id\", \"userId\", \"usuarioId\", \"notificationsEnabled\", \"notifyNewApplications\", \"notifyNewContacts\", \"notifySecurityAlerts\", \"updatedAt\") VALUES ('settings-1', 'legacy-1', 'admin-1', true, true, false, true, CURRENT_TIMESTAMP)");
  }

  @Test void readsAndUpdatesTheReconciledSettingsInPostgres() {
    var initial = service.get("admin-1");
    var updated = service.update("admin-1", new AdminSettingsService.Update("Updated", false, null, true, null));

    assertThat(initial.profile().email()).isEqualTo("admin@example.com");
    assertThat(initial.preferences().notifyNewContacts()).isFalse();
    assertThat(updated.profile().name()).isEqualTo("Updated");
    assertThat(updated.preferences().notificationsEnabled()).isFalse();
    assertThat(updated.preferences().notifyNewContacts()).isTrue();
  }
}
