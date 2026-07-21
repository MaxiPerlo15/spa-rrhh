package com.meinardi.rrhh.presentation;

import com.meinardi.rrhh.application.HealthService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/health")
public class HealthController {
  private static final String NO_STORE = "no-store";

  private final HealthService healthService;

  public HealthController(HealthService healthService) {
    this.healthService = healthService;
  }

  @GetMapping
  public ResponseEntity<HealthResponse> health() {
    try {
      healthService.checkDatabaseReadiness();
      return response(HttpStatus.OK, new HealthResponse("ok", "ready"));
    } catch (RuntimeException exception) {
      return response(HttpStatus.SERVICE_UNAVAILABLE, new HealthResponse("error", "unavailable"));
    }
  }

  private ResponseEntity<HealthResponse> response(HttpStatus status, HealthResponse body) {
    return ResponseEntity.status(status).header(HttpHeaders.CACHE_CONTROL, NO_STORE).body(body);
  }

  private record HealthResponse(String status, String database) {}
}
