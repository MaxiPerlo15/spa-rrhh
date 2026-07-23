package com.meinardi.rrhh.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.Set;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.testcontainers.containers.PostgreSQLContainer;

@ExtendWith(SpringExtension.class)
@SpringBootTest(
    properties = {
      "spring.flyway.enabled=true",
      "spring.jpa.hibernate.ddl-auto=validate",
      "spring.datasource.driver-class-name=org.postgresql.Driver",
      "rrhh.security.internal-api-token=test-token"
    })
class FlywayEmptyDatabaseIntegrationTest {

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
  @Autowired private Flyway flyway;

  @Test
  void migratesAnEmptyPostgresDatabaseToTheCapturedVersionOneCatalog() throws Exception {
    assertThat(catalogTables())
        .containsAll(
            Set.of(
                "AdminAuditLog",
                "AdminNotification",
                "AdminSettings",
                "Application",
                "Candidate",
                "Contact",
                "PasswordResetToken",
                "User",
                "Vacancy",
                "candidato",
                "contacto",
                "estado",
                "estado_historial",
                "permiso",
                "postulacion",
                "rol",
                "rol_permiso",
                "user",
                "usuario",
                "vacante"));
  }

  @Test
  void recordsTheResolvedVersionSixChecksumAndStartsWithHibernateValidation() throws Exception {
    var versionSix = flyway.info().current();

    assertThat(historyChecksum()).isEqualTo(versionSix.getAppliedChecksum());
    assertThat(versionSix.getResolvedChecksum()).isEqualTo(versionSix.getAppliedChecksum());
    assertThat(versionSix.isChecksumMatching()).isTrue();
    assertThat(versionSix.getVersion().getVersion()).isEqualTo("6");
  }

  private Set<String> catalogTables() throws Exception {
    try (Connection connection = dataSource.getConnection();
        PreparedStatement statement =
            connection.prepareStatement(
                "select table_name from information_schema.tables where table_schema = 'public'");
        ResultSet result = statement.executeQuery()) {
      Set<String> tables = new java.util.HashSet<>();
      while (result.next()) {
        tables.add(result.getString(1));
      }
      return tables;
    }
  }

  private Integer historyChecksum() throws Exception {
    try (Connection connection = dataSource.getConnection();
        PreparedStatement statement =
            connection.prepareStatement(
                "select checksum from flyway_schema_history where version = '6' and success = true");
        ResultSet result = statement.executeQuery()) {
      assertThat(result.next()).isTrue();
      return result.getInt(1);
    }
  }
}
