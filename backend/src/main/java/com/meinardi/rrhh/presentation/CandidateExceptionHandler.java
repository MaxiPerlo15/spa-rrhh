package com.meinardi.rrhh.presentation;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = CandidateRestController.class)
public class CandidateExceptionHandler {

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<Map<String, String>> handleIllegalArgument(IllegalArgumentException exception) {
    String message = exception.getMessage();
    if ("DUPLICATE_CANDIDATE".equals(message)) {
      return ResponseEntity.status(HttpStatus.CONFLICT)
          .body(Map.of(
              "error", "Ya existe un candidato registrado con estos datos de contacto.",
              "code", "DUPLICATE_CANDIDATE"));
    }
    if ("CANDIDATE_IDENTITY_CONFLICT".equals(message)) {
      return ResponseEntity.status(HttpStatus.CONFLICT)
          .body(Map.of(
              "error", "Los nuevos datos de contacto ya pertenecen a otro candidato registrado.",
              "code", "CANDIDATE_IDENTITY_CONFLICT"));
    }
    if (message != null && message.contains("not found")) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND)
          .body(Map.of("error", "Candidato no encontrado"));
    }
    return ResponseEntity.badRequest()
        .body(Map.of("error", message != null ? message : "Bad request"));
  }
}
