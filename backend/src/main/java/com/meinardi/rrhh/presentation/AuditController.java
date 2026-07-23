package com.meinardi.rrhh.presentation;

import com.meinardi.rrhh.application.AuditFilters;
import com.meinardi.rrhh.application.AuditQuery;
import com.meinardi.rrhh.application.AuditService;
import com.meinardi.rrhh.domain.model.AdminAuditLog;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/audit")
public class AuditController {
  private final AuditService service;
  public AuditController(AuditService service) { this.service = service; }
  @GetMapping public Response list(@RequestParam(required = false) String actorEmail, @RequestParam(required = false) String action, @RequestParam(required = false) String resourceType, @RequestParam(required = false) String dateFrom, @RequestParam(required = false) String dateTo, @RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "20") int limit) {
    if (page < 1 || limit < 1 || limit > 50) throw new IllegalArgumentException("Invalid pagination"); if (blank(actorEmail) || blank(action) || blank(resourceType)) throw new IllegalArgumentException("Audit filters must not be blank");
    OffsetDateTime from = start(dateFrom); OffsetDateTime to = end(dateTo); if (from != null && to != null && from.isAfter(to)) throw new IllegalArgumentException("dateFrom must not be after dateTo");
    Page<AdminAuditLog> entries = service.list(new AuditQuery(actorEmail, action, resourceType, from, to), PageRequest.of(page - 1, limit)); AuditFilters filters = service.filters();
    return new Response(entries.getContent().stream().map(Item::from).toList(), new Pagination(page, limit, entries.getTotalElements(), Math.max(1, entries.getTotalPages())), filters);
  }
  @ExceptionHandler({IllegalArgumentException.class, java.time.format.DateTimeParseException.class}) @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.BAD_REQUEST) public Map<String, String> invalid(Exception exception) { return Map.of("error", exception.getMessage()); }
  @ExceptionHandler(Exception.class) @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR) public Map<String, String> unexpected(Exception exception) { return Map.of("error", "Internal server error"); }
  private OffsetDateTime start(String value) { return value == null ? null : LocalDate.parse(value).atStartOfDay().atOffset(ZoneOffset.UTC); }
  private OffsetDateTime end(String value) { return value == null ? null : LocalDate.parse(value).plusDays(1).atStartOfDay().minusNanos(1).atOffset(ZoneOffset.UTC); }
  private boolean blank(String value) { return value != null && value.isBlank(); }
  public record Pagination(int page, int limit, long total, int totalPages) {}
  public record Item(String id, String actorUserId, String actorEmail, String action, String resourceType, String resourceId, String outcome, String ip, String userAgent, Map<String, Object> metadata, String createdAt) { static Item from(AdminAuditLog entry) { return new Item(entry.getId(), entry.getActorId(), entry.getActorEmail(), entry.getAction(), entry.getResourceType(), entry.getResourceId(), entry.getOutcome().name(), entry.getIp(), entry.getUserAgent(), entry.getMetadata(), entry.getCreatedAt().toInstant().toString()); } }
  public record Response(List<Item> items, Pagination pagination, AuditFilters filters) {}
}
