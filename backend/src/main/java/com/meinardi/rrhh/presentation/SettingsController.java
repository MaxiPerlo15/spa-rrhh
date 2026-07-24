package com.meinardi.rrhh.presentation;

import com.meinardi.rrhh.application.AdminSettingsService;
import com.meinardi.rrhh.domain.model.Usuario;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/settings")
public class SettingsController {
  private final AdminSettingsService service;
  public SettingsController(AdminSettingsService service) { this.service = service; }
  @GetMapping public Response get(@AuthenticationPrincipal Usuario user) { return Response.from(service.get(user.getId())); }
  @PutMapping public Response update(@AuthenticationPrincipal Usuario user, @RequestBody AdminSettingsService.Update update) {
    if (update == null || update.empty() || (update.name() != null && update.name().trim().isEmpty())) throw new IllegalArgumentException("Datos inválidos");
    return Response.from(service.update(user.getId(), update));
  }
  @ExceptionHandler(IllegalArgumentException.class) @ResponseStatus(HttpStatus.BAD_REQUEST) public Map<String, String> invalid(IllegalArgumentException error) { return Map.of("error", error.getMessage()); }
  @ExceptionHandler(HttpMessageNotReadableException.class) @ResponseStatus(HttpStatus.BAD_REQUEST) public Map<String, String> malformed(HttpMessageNotReadableException error) { return Map.of("error", "Malformed request body"); }
  @ExceptionHandler(java.util.NoSuchElementException.class) @ResponseStatus(HttpStatus.NOT_FOUND) public Map<String, String> missing(java.util.NoSuchElementException error) { return Map.of("error", error.getMessage()); }
  @ExceptionHandler(Exception.class) @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR) public Map<String, String> unexpected(Exception error) { return Map.of("error", "Internal server error"); }
  public record Response(AdminSettingsService.Profile profile, AdminSettingsService.Preferences preferences, Backend backend, String updatedAt) {
    static Response from(AdminSettingsService.Settings settings) { return new Response(settings.profile(), settings.preferences(), new Backend(settings.springVacanciesEnabled()), settings.updatedAt()); }
  }
  public record Backend(boolean springVacanciesEnabled) {}
}
