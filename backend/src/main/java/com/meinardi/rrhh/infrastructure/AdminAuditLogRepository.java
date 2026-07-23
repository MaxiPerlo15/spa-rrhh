package com.meinardi.rrhh.infrastructure;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.meinardi.rrhh.application.AuditFilters;
import com.meinardi.rrhh.application.AuditQuery;
import com.meinardi.rrhh.domain.model.AdminAuditLog;
import com.meinardi.rrhh.domain.model.AuditOutcome;
import java.sql.ResultSet;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AdminAuditLogRepository {
  private final JdbcTemplate jdbc; private final ObjectMapper mapper;
  public AdminAuditLogRepository(JdbcTemplate jdbc, ObjectMapper mapper) { this.jdbc = jdbc; this.mapper = mapper; }
  public AdminAuditLog save(AdminAuditLog entry) {
    jdbc.update("INSERT INTO \"AdminAuditLog\" (\"id\",\"actorUserId\",\"actorEmail\",\"action\",\"resourceType\",\"resourceId\",\"outcome\",\"ip\",\"userAgent\",\"metadata\",\"createdAt\") VALUES (?,?,?,?,?,?,CAST(? AS \"AuditOutcome\"),?,?,CAST(? AS jsonb),?)", entry.getId(), entry.getActorId(), entry.getActorEmail(), entry.getAction(), entry.getResourceType(), entry.getResourceId(), entry.getOutcome().name(), entry.getIp(), entry.getUserAgent(), json(entry.getMetadata()), entry.getCreatedAt());
    return entry;
  }
  public Page<AdminAuditLog> list(AuditQuery filter, Pageable page) {
    List<Object> values = new ArrayList<>(); String where = where(filter, values);
    List<Object> pageValues = new ArrayList<>(values); pageValues.add(page.getPageSize()); pageValues.add(page.getOffset());
    List<AdminAuditLog> items = jdbc.query("SELECT * FROM \"AdminAuditLog\"" + where + " ORDER BY \"createdAt\" DESC, \"id\" DESC LIMIT ? OFFSET ?", (rs, row) -> map(rs), pageValues.toArray());
    Long total = jdbc.queryForObject("SELECT count(*) FROM \"AdminAuditLog\"" + where, Long.class, values.toArray());
    return new PageImpl<>(items, page, total == null ? 0 : total);
  }
  public AuditFilters filters() { return new AuditFilters(values("\"action\""), values("\"resourceType\""), values("\"actorEmail\"", " WHERE \"actorEmail\" IS NOT NULL")); }
  public void deleteAll() { jdbc.update("DELETE FROM \"AdminAuditLog\""); }
  private String where(AuditQuery filter, List<Object> values) {
    List<String> clauses = new ArrayList<>(); add(clauses, values, "\"actorEmail\"", filter.actorEmail()); add(clauses, values, "\"action\"", filter.action()); add(clauses, values, "\"resourceType\"", filter.resourceType());
    if (filter.dateFrom() != null) { clauses.add("\"createdAt\">=?"); values.add(filter.dateFrom()); } if (filter.dateTo() != null) { clauses.add("\"createdAt\"<=?"); values.add(filter.dateTo()); }
    return clauses.isEmpty() ? "" : " WHERE " + String.join(" AND ", clauses);
  }
  private void add(List<String> clauses, List<Object> values, String column, String value) { if (value != null && !value.isBlank()) { clauses.add(column + "=?"); values.add(value); } }
  private List<String> values(String column) { return values(column, ""); }
  private List<String> values(String column, String condition) { return jdbc.query("SELECT DISTINCT " + column + " FROM \"AdminAuditLog\"" + condition + " ORDER BY " + column, (rs, row) -> rs.getString(1)); }
  private AdminAuditLog map(ResultSet rs) throws java.sql.SQLException { return AdminAuditLog.create(rs.getString("id"), rs.getString("actorUserId"), rs.getString("actorEmail"), rs.getString("action"), rs.getString("resourceType"), rs.getString("resourceId"), AuditOutcome.valueOf(rs.getString("outcome")), rs.getString("ip"), rs.getString("userAgent"), metadata(rs.getString("metadata")), rs.getObject("createdAt", OffsetDateTime.class)); }
  private String json(Map<String, Object> metadata) { try { return mapper.writeValueAsString(metadata); } catch (Exception exception) { throw new IllegalArgumentException("Audit metadata is not serializable", exception); } }
  private Map<String, Object> metadata(String metadata) { try { return metadata == null ? Map.of() : mapper.readValue(metadata, new TypeReference<>() {}); } catch (Exception exception) { throw new IllegalStateException("Stored audit metadata is invalid", exception); } }
}
