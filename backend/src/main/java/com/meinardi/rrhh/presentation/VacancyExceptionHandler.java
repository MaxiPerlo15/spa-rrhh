package com.meinardi.rrhh.presentation;

import jakarta.annotation.Nonnull;
import jakarta.persistence.EntityNotFoundException;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = VacancyRestController.class)
public class VacancyExceptionHandler {
  @ExceptionHandler(EntityNotFoundException.class)
  public ResponseEntity<ApiError> handleNotFound(EntityNotFoundException exception) {
    return error(HttpStatus.NOT_FOUND, exception);
  }

  @ExceptionHandler(IllegalStateException.class)
  public ResponseEntity<ApiError> handleConflict(IllegalStateException exception) {
    return error(HttpStatus.CONFLICT, exception);
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<ApiError> handleBadRequest(IllegalArgumentException exception) {
    return error(HttpStatus.BAD_REQUEST, exception);
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException exception) {
    String message =
        exception.getBindingResult().getFieldErrors().stream()
            .map(fieldError -> fieldError.getField() + ": " + fieldError.getDefaultMessage())
            .collect(Collectors.joining(", "));

    return ResponseEntity.badRequest()
        .body(new ApiError(message.isBlank() ? "Request validation failed" : message));
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<ApiError> handleInvalidBody(HttpMessageNotReadableException exception) {
    return ResponseEntity.badRequest().body(new ApiError("Request body is invalid"));
  }

  private ResponseEntity<ApiError> error(@Nonnull HttpStatus status, RuntimeException exception) {
    return ResponseEntity.status(status).body(new ApiError(exception.getMessage()));
  }

  public record ApiError(String error) {}
}
