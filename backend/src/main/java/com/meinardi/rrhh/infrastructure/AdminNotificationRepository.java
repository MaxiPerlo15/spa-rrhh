package com.meinardi.rrhh.infrastructure;

import com.meinardi.rrhh.domain.model.AdminNotification;
import java.sql.ResultSet;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.springframework.data.domain.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AdminNotificationRepository {
  private final JdbcTemplate jdbc;
  public AdminNotificationRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }
  public Optional<AdminNotification> findById(String id) { return jdbc.query("SELECT * FROM \"AdminNotification\" WHERE \"id\"=?", (rs, row) -> map(rs), id).stream().findFirst(); }
  public AdminNotification save(AdminNotification n) { if (jdbc.update("UPDATE \"AdminNotification\" SET \"isRead\"=?, \"updatedAt\"=CURRENT_TIMESTAMP WHERE \"id\"=?", n.isRead(), n.getId()) == 0) jdbc.update("INSERT INTO \"AdminNotification\" (\"id\",\"title\",\"message\",\"level\",\"isRead\",\"actionLabel\",\"actionType\",\"actionResourceId\",\"createdAt\",\"updatedAt\") VALUES (?,?,?,CAST(? AS \"NotificationLevel\"),?,?,CAST(? AS \"AdminNotificationActionType\"),?,?,?)", n.getId(), n.getTitle(), n.getMessage(), n.getLevel().name(), n.isRead(), n.getActionLabel(), n.getActionType() == null ? null : n.getActionType().name(), n.getActionResourceId(), n.getCreatedAt(), n.getUpdatedAt()); return n; }
  public Page<AdminNotification> findAll(Pageable page) { return page(null, page); }
  public Page<AdminNotification> findAllByIsRead(boolean read, Pageable page) { return page(read, page); }
  public long count() { return jdbc.queryForObject("SELECT count(*) FROM \"AdminNotification\"", Long.class); }
  public void deleteAll() { jdbc.update("DELETE FROM \"AdminNotification\""); }
  public long deleteByIsRead(boolean read) { return jdbc.update("DELETE FROM \"AdminNotification\" WHERE \"isRead\"=?", read); }
  public void delete(AdminNotification n) { jdbc.update("DELETE FROM \"AdminNotification\" WHERE \"id\"=?", n.getId()); }
  private Page<AdminNotification> page(Boolean read, Pageable p) { String where = read == null ? "" : " WHERE \"isRead\"=" + read; var items = jdbc.query("SELECT * FROM \"AdminNotification\"" + where + " ORDER BY \"createdAt\" DESC LIMIT ? OFFSET ?", (rs, row) -> map(rs), p.getPageSize(), p.getOffset()); Long total = jdbc.queryForObject("SELECT count(*) FROM \"AdminNotification\"" + where, Long.class); return new PageImpl<>(items, p, total == null ? 0 : total); }
  private AdminNotification map(ResultSet rs) throws java.sql.SQLException { return AdminNotification.persisted(rs.getString("id"), rs.getString("title"), rs.getString("message"), rs.getString("level"), rs.getBoolean("isRead"), rs.getString("actionLabel"), rs.getString("actionType"), rs.getString("actionResourceId"), rs.getObject("createdAt", OffsetDateTime.class), rs.getObject("updatedAt", OffsetDateTime.class)); }
}
