package com.meinardi.rrhh.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

@Service
@Profile("!email")
public class LoggingEmailService implements EmailService {

  private static final Logger log = LoggerFactory.getLogger(LoggingEmailService.class);

  @Override
  public void sendResetEmail(String email, String token) {
    log.info(
        "Password reset email for {}: token={}, link=/auth/reset-password?token={}",
        email,
        token,
        token);
  }
}
