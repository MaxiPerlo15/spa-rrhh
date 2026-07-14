package com.meinardi.rrhh.infrastructure;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;

public final class FlywayCatalogAdopter {

  private static final String APPROVED_V1_FINGERPRINT =
      "df6b0eb96393e98229562e5cd26fb5d9b7d1fd9105cb26325e451e7807681998";
  private static final String CATALOG_QUERY =
      "WITH catalog_objects AS ("
          + "SELECT 'table:' || table_name object FROM information_schema.tables "
          + "WHERE table_schema = 'public' AND table_type = 'BASE TABLE' "
          + "AND table_name <> 'flyway_schema_history' UNION ALL "
          + "SELECT 'column:' || table_name || ':' || column_name || ':' || data_type || ':' "
          + "|| udt_name || ':' || is_nullable || ':' || COALESCE(column_default, '') "
          + "FROM information_schema.columns WHERE table_schema = 'public' "
          + "AND table_name <> 'flyway_schema_history' UNION ALL "
          + "SELECT 'constraint:' || conname || ':' || pg_get_constraintdef(oid) "
          + "FROM pg_constraint WHERE connamespace = 'public'::regnamespace UNION ALL "
          + "SELECT 'index:' || indexname || ':' || indexdef FROM pg_indexes "
          + "WHERE schemaname = 'public' AND tablename <> 'flyway_schema_history' UNION ALL "
          + "SELECT 'enum:' || t.typname || ':' || string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) "
          + "FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid "
          + "WHERE t.typnamespace = 'public'::regnamespace GROUP BY t.typname) "
          + "SELECT object FROM catalog_objects ORDER BY object";

  private final DataSource dataSource;

  public FlywayCatalogAdopter(DataSource dataSource) {
    this.dataSource = dataSource;
  }

  public void adopt(Flyway flyway) {
    if (!hasApplicationCatalog() || hasFlywayHistory()) {
      flyway.migrate();
      return;
    }
    String fingerprint = fingerprint();
    if (!APPROVED_V1_FINGERPRINT.equals(fingerprint)) {
      throw new IllegalStateException(
          "Existing catalog does not match the approved V1 catalog: " + fingerprint);
    }
    flyway.baseline();
    flyway.migrate();
  }

  private boolean hasApplicationCatalog() {
    return exists(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
            + "WHERE table_schema = 'public' AND table_name <> 'flyway_schema_history')");
  }

  private boolean hasFlywayHistory() {
    return exists(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
            + "WHERE table_schema = 'public' AND table_name = 'flyway_schema_history')");
  }

  private boolean exists(String query) {
    try (Connection connection = dataSource.getConnection();
        PreparedStatement statement = connection.prepareStatement(query);
        ResultSet result = statement.executeQuery()) {
      result.next();
      return result.getBoolean(1);
    } catch (Exception exception) {
      throw new IllegalStateException("Unable to inspect the existing database catalog", exception);
    }
  }

  private String fingerprint() {
    try (Connection connection = dataSource.getConnection();
        PreparedStatement statement = connection.prepareStatement(CATALOG_QUERY);
        ResultSet result = statement.executeQuery()) {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      while (result.next()) {
        digest.update(result.getString(1).getBytes(StandardCharsets.UTF_8));
        digest.update((byte) 0);
      }
      return java.util.HexFormat.of().formatHex(digest.digest());
    } catch (Exception exception) {
      throw new IllegalStateException("Unable to fingerprint the existing database catalog", exception);
    }
  }
}
