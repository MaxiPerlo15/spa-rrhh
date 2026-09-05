package com.meinardi.rrhh.presentation;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.meinardi.rrhh.application.NotificationNotFoundException;
import com.meinardi.rrhh.application.NotificationService;
import com.meinardi.rrhh.domain.model.AdminNotification;
import com.meinardi.rrhh.domain.model.NotificationLevel;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/notifications")
public class NotificationController {
  private final NotificationService notificationService;
  public NotificationController(NotificationService notificationService) { this.notificationService = notificationService; }

  @GetMapping
  public ListResponse list(@RequestParam(defaultValue = "all") String view, @RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "20") int limit) {
    if (!view.equals("all") && !view.equals("unread") && !view.equals("read")) throw new IllegalArgumentException("Parámetro view inválido");
    if (page < 1 || limit < 1 || limit > 50) throw new IllegalArgumentException("Datos inválidos");
    Page<AdminNotification> results = notificationService.list(view, PageRequest.of(page - 1, limit));
    return new ListResponse(results.map(NotificationResponse::from).getContent(), new Pagination(page, limit, results.getTotalElements(), Math.max(1, results.getTotalPages())));
  }

  @PostMapping @ResponseStatus(HttpStatus.CREATED)
  public NotificationResponse create(@Valid @RequestBody CreateRequest request) {
    ActionRequest action = request.action();
    return NotificationResponse.from(notificationService.create(request.title(), request.message(), request.level() == null ? NotificationLevel.INFO : request.level(), action == null ? null : action.label(), action == null ? null : action.type(), action == null ? null : action.resourceId()));
  }

  @PatchMapping("/{id}")
  public NotificationResponse update(@PathVariable String id, @Valid @RequestBody UpdateRequest request) { return NotificationResponse.from(notificationService.updateReadState(id, request.isRead())); }

  @DeleteMapping
  public Map<String, Long> deleteMany(@RequestParam String view) {
    if (!view.equals("all") && !view.equals("read")) throw new IllegalArgumentException("Parámetro view inválido");
    return Map.of("deletedCount", notificationService.delete(view));
  }

  @DeleteMapping("/{id}")
  public Map<String, String> delete(@PathVariable String id) { notificationService.deleteOne(id); return Map.of("message", "Notificación eliminada"); }

  @ExceptionHandler(NotificationNotFoundException.class) @ResponseStatus(HttpStatus.NOT_FOUND)
  public Map<String, String> missing(NotificationNotFoundException exception) { return Map.of("error", exception.getMessage()); }
  @ExceptionHandler(IllegalArgumentException.class) @ResponseStatus(HttpStatus.BAD_REQUEST)
  public Map<String, String> invalid(IllegalArgumentException exception) { return Map.of("error", exception.getMessage()); }

  public record CreateRequest(@NotBlank @Size(max = 120) String title, @NotBlank @Size(max = 500) String message, NotificationLevel level, ActionRequest action) {}
  public record ActionRequest(@NotBlank @Size(max = 40) String label, @NotBlank String type, @NotBlank String resourceId) {}
  public record UpdateRequest(@NotNull Boolean isRead) {}
  public record Pagination(int page, int limit, long total, int totalPages) {}
  public record ListResponse(java.util.List<NotificationResponse> items, Pagination pagination) {}
  @JsonInclude(JsonInclude.Include.NON_NULL)
  public record NotificationResponse(String id, String title, String message, String level, boolean isRead, ActionResponse action, String createdAt) {
    static NotificationResponse from(AdminNotification n) { return new NotificationResponse(n.getId(), n.getTitle(), n.getMessage(), n.getLevel().name().toLowerCase(), n.isRead(), n.getActionLabel() == null ? null : new ActionResponse(n.getActionLabel(), n.getActionType().name(), n.getActionResourceId()), n.getCreatedAt().toInstant().toString()); }
  }
  public record ActionResponse(String label, String type, String resourceId) {}
}
