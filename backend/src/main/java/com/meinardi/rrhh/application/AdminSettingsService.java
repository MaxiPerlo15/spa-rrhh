package com.meinardi.rrhh.application;

import java.sql.ResultSet;
import java.time.OffsetDateTime;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminSettingsService {
  private final JdbcTemplate jdbc;
  public AdminSettingsService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

  public Settings get(String userId) { return jdbc.query("SELECT u.id, u.email, u.nombre_usuario, r.nombre role, s.\"notificationsEnabled\", s.\"notifyNewApplications\", s.\"notifyNewContacts\", s.\"notifySecurityAlerts\", s.\"updatedAt\" FROM \"AdminSettings\" s JOIN usuario u ON u.id=s.\"usuarioId\" JOIN rol r ON r.id=u.rol_id WHERE u.id=?", (rs, row) -> map(rs), userId).stream().findFirst().orElseThrow(() -> new NoSuchElementException("Usuario no encontrado")); }

  @Transactional
  public Settings update(String userId, Update update) {
    if (update.empty()) throw new IllegalArgumentException("Datos inválidos");
    if (update.name() != null) jdbc.update("UPDATE usuario SET nombre_usuario=? WHERE id=?", update.name(), userId);
    jdbc.update("UPDATE \"AdminSettings\" SET \"notificationsEnabled\"=COALESCE(?,\"notificationsEnabled\"), \"notifyNewApplications\"=COALESCE(?,\"notifyNewApplications\"), \"notifyNewContacts\"=COALESCE(?,\"notifyNewContacts\"), \"notifySecurityAlerts\"=COALESCE(?,\"notifySecurityAlerts\"), \"updatedAt\"=CURRENT_TIMESTAMP WHERE \"usuarioId\"=?", update.notificationsEnabled(), update.notifyNewApplications(), update.notifyNewContacts(), update.notifySecurityAlerts(), userId);
    return get(userId);
  }

  private Settings map(ResultSet rs) throws java.sql.SQLException { return new Settings(new Profile(rs.getString("id"), rs.getString("email"), rs.getString("nombre_usuario"), rs.getString("role")), new Preferences(rs.getBoolean("notificationsEnabled"), rs.getBoolean("notifyNewApplications"), rs.getBoolean("notifyNewContacts"), rs.getBoolean("notifySecurityAlerts")), rs.getObject("updatedAt", OffsetDateTime.class).toInstant().toString()); }
  public record Profile(String id, String email, String name, String role) {}
  public record Preferences(boolean notificationsEnabled, boolean notifyNewApplications, boolean notifyNewContacts, boolean notifySecurityAlerts) {}
  public record Settings(Profile profile, Preferences preferences, String updatedAt) { public boolean springVacanciesEnabled() { return true; } }
  public record Update(String name, Boolean notificationsEnabled, Boolean notifyNewApplications, Boolean notifyNewContacts, Boolean notifySecurityAlerts) { public boolean empty() { return name == null && notificationsEnabled == null && notifyNewApplications == null && notifyNewContacts == null && notifySecurityAlerts == null; } }
}
