package com.meinardi.rrhh.application;

public interface ResumeStorage {
  void delete(String expectedResumeKey) throws ResumeStorageException;
}

class ResumeStorageException extends RuntimeException {
  private final boolean retryable;

  ResumeStorageException(String message, boolean retryable) {
    super(message);
    this.retryable = retryable;
  }

  boolean isRetryable() {
    return retryable;
  }
}

class ResumeObjectNotFoundException extends ResumeStorageException {
  ResumeObjectNotFoundException(String expectedResumeKey) {
    super("Resume object not found: " + expectedResumeKey, false);
  }
}
