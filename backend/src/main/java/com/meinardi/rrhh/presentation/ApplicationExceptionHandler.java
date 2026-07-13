package com.meinardi.rrhh.presentation;

import jakarta.annotation.Nonnull;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice(assignableTypes = ApplicationRestController.class)
public class ApplicationExceptionHandler {

  private static final String DUPLICATE_CODE = "DUPLICATE_SUBMISSION";

  @ExceptionHandler(ResponseStatusException.class)
  public ResponseEntity<Map<String, String>> handleResponseStatus(ResponseStatusException exception) {
    return ResponseEntity.status(exception.getStatusCode())
        .body(Map.of("error", exception.getReason() != null ? exception.getReason() : "Not found"));
  }

  @ExceptionHandler(IllegalStateException.class)
  public ResponseEntity<Map<String, String>> handleConflict(IllegalStateException exception) {
    String message = exception.getMessage();
    if (message != null && message.contains("Ya recibimos una postulación reciente")) {
      return ResponseEntity.status(HttpStatus.CONFLICT)
          .body(Map.of("error", message, "code", DUPLICATE_CODE));
    }
    if (message != null && message.contains("ya se encuentra en estado")) {
      return ResponseEntity.status(HttpStatus.CONFLICT)
          .body(Map.of("error", message, "code", "SAME_STATUS"));
    }
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(Map.of("error", message != null ? message : "Error de negocio"));
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException exception) {
    return ResponseEntity.badRequest()
        .body(Map.of("error", exception.getMessage() != null ? exception.getMessage() : "Solicitud inválida"));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException exception) {
    String message =
        exception.getBindingResult().getFieldErrors().stream()
            .map(fieldError -> fieldError.getField() + ": " + fieldError.getDefaultMessage())
            .collect(Collectors.joining(", "));

    return ResponseEntity.badRequest()
        .body(Map.of("error", message.isBlank() ? "Request validation failed" : message));
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<Map<String, String>> handleInvalidBody(HttpMessageNotReadableException exception) {
    return ResponseEntity.badRequest()
        .body(Map.of("error", "Request body is invalid"));
  }
}
