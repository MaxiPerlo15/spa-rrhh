package com.meinardi.rrhh.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.Statement;
import java.util.Set;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.postgresql.ds.PGSimpleDataSource;
import org.testcontainers.containers.PostgreSQLContainer;

class FlywayAdoptionIntegrationTest {

  private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

  static {
    POSTGRES.start();
  }

  private DataSource dataSource;

  @BeforeEach
  void setUp() {
    PGSimpleDataSource postgres = new PGSimpleDataSource();
    postgres.setUrl(POSTGRES.getJdbcUrl());
    postgres.setUser(POSTGRES.getUsername());
    postgres.setPassword(POSTGRES.getPassword());
    dataSource = postgres;
  }

  @AfterEach
  void tearDown() throws Exception {
    execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public");
  }

  @Test
  void baselinesOnlyTheApprovedExistingCatalogAtVersionOne() throws Exception {
    createCapturedCatalogWithoutFlywayHistory();

    new FlywayCatalogAdopter(dataSource).adopt(flyway());

    assertThat(flyway().info().current().getVersion().getVersion()).isEqualTo("3");
    assertThat(applicationObjects()).contains("User:id", "usuario:id", "vacante:id");
  }

  @Test
  void rejectsCatalogDriftWithoutCreatingFlywayHistory() throws Exception {
    createCapturedCatalogWithoutFlywayHistory();
    execute("ALTER TABLE usuario ADD COLUMN unapproved_drift TEXT");

    assertThatThrownBy(() -> new FlywayCatalogAdopter(dataSource).adopt(flyway()))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("does not match the approved V1 catalog");

    assertThat(applicationObjects()).contains("usuario:unapproved_drift");
    assertThat(flywayHistoryExists()).isFalse();
  }

  @Test
  void appliesVersionTwoEvidenceWithoutChangingTheCapturedVersionOneObjects() throws Exception {
    createCapturedCatalogWithoutFlywayHistory();
    Set<String> before = applicationObjects();

    new FlywayCatalogAdopter(dataSource).adopt(flyway());

    assertThat(applicationObjects()).containsAll(before).contains("reconciliation_runs:catalog_fingerprint");
    assertThat(flywayHistoryExists()).isTrue();
  }

  private Flyway flyway() {
    return Flyway.configure()
        .dataSource(dataSource)
        .locations("classpath:db/migration")
        .baselineOnMigrate(false)
        .load();
  }

  private void createCapturedCatalogWithoutFlywayHistory() throws Exception {
    String migration =
        new String(
            getClass().getResourceAsStream("/db/migration/V1__captured_current_catalog.sql").readAllBytes(),
            StandardCharsets.UTF_8);
    for (String statement : migration.split(";")) {
      if (!statement.isBlank()) {
        execute(statement);
      }
    }
  }

  private Set<String> applicationObjects() throws Exception {
    try (Connection connection = dataSource.getConnection();
        Statement statement = connection.createStatement();
        var result =
            statement.executeQuery(
                "SELECT table_name || ':' || column_name FROM information_schema.columns "
                    + "WHERE table_schema = 'public' AND table_name <> 'flyway_schema_history' "
                    + "ORDER BY table_name, ordinal_position")) {
      Set<String> names = new java.util.TreeSet<>();
      while (result.next()) {
        names.add(result.getString(1));
      }
      return names;
    }
  }

  private boolean flywayHistoryExists() throws Exception {
    try (Connection connection = dataSource.getConnection();
        Statement statement = connection.createStatement();
        var result =
            statement.executeQuery(
                "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
                    + "WHERE table_schema = 'public' AND table_name = 'flyway_schema_history')")) {
      result.next();
      return result.getBoolean(1);
    }
  }

  private void execute(String sql) throws Exception {
    try (Connection connection = dataSource.getConnection(); Statement statement = connection.createStatement()) {
      statement.execute(sql);
    }
  }
}
