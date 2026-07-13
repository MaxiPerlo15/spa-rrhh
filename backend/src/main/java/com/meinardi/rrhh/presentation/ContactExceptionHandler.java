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

@RestControllerAdvice(assignableTypes = ContactoRestController.class)
public class ContactExceptionHandler {

  @ExceptionHandler(ResponseStatusException.class)
  public ResponseEntity<Map<String, String>> handleResponseStatus(ResponseStatusException exception) {
    String reason = exception.getReason();
    if ("DUPLICATE_SUBMISSION".equals(reason)) {
      return ResponseEntity.status(HttpStatus.CONFLICT)
          .body(Map.of("error", "Ya recibimos un contacto reciente con el mismo asunto desde estos datos.", "code", "DUPLICATE_SUBMISSION"));
    }
    if ("INVALID_CONTACT_TRANSITION".equals(reason)) {
      return ResponseEntity.status(HttpStatus.BAD_REQUEST)
          .body(Map.of("error", "Transición inválida de contacto", "code", "INVALID_CONTACT_TRANSITION"));
    }
    return ResponseEntity.status(exception.getStatusCode())
        .body(Map.of("error", reason != null ? reason : "Not found"));
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
