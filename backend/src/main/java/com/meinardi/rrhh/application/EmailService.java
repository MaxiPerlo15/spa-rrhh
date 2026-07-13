package com.meinardi.rrhh.application;

public interface EmailService {
  void sendResetEmail(String email, String token);
}
