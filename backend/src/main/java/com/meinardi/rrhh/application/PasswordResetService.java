package com.meinardi.rrhh.application;

import com.meinardi.rrhh.domain.model.Usuario;
import com.meinardi.rrhh.infrastructure.UsuarioRepository;
import java.time.Instant;
import java.util.Optional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class PasswordResetService {

  private final UsuarioRepository usuarioRepository;
  private final PasswordEncoder passwordEncoder;
  private final EmailService emailService;

  public PasswordResetService(
      UsuarioRepository usuarioRepository,
      PasswordEncoder passwordEncoder,
      EmailService emailService) {
    this.usuarioRepository = usuarioRepository;
    this.passwordEncoder = passwordEncoder;
    this.emailService = emailService;
  }

  public void generateResetToken(String email) {
    Optional<Usuario> usuarioOpt = usuarioRepository.findByEmail(email);
    if (usuarioOpt.isEmpty()) {
      return;
    }
    Usuario usuario = usuarioOpt.get();
    String token = java.util.UUID.randomUUID().toString();
    usuario.setPasswordResetToken(token);
    usuario.setPasswordResetTokenExpiry(Instant.now().plusSeconds(3600));
    usuarioRepository.save(usuario);
    emailService.sendResetEmail(email, token);
  }

  public boolean validateResetToken(String token) {
    Optional<Usuario> usuarioOpt = usuarioRepository.findByPasswordResetToken(token);
    if (usuarioOpt.isEmpty()) {
      return false;
    }
    Usuario usuario = usuarioOpt.get();
    return usuario.getPasswordResetTokenExpiry() != null
        && usuario.getPasswordResetTokenExpiry().isAfter(Instant.now());
  }

  public void resetPassword(String token, String newPassword) {
    Optional<Usuario> usuarioOpt = usuarioRepository.findByPasswordResetToken(token);
    if (usuarioOpt.isEmpty()) {
      throw new IllegalArgumentException("Invalid reset token");
    }
    Usuario usuario = usuarioOpt.get();
    if (usuario.getPasswordResetToken() == null) {
      throw new IllegalArgumentException("Invalid reset token");
    }
    if (usuario.getPasswordResetTokenExpiry() == null
        || usuario.getPasswordResetTokenExpiry().isBefore(Instant.now())) {
      throw new IllegalArgumentException("Expired reset token");
    }
    usuario.setPassword(passwordEncoder.encode(newPassword));
    usuario.setPasswordResetToken(null);
    usuario.setPasswordResetTokenExpiry(null);
    usuarioRepository.save(usuario);
  }
}
