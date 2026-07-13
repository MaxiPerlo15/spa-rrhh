package com.meinardi.rrhh.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.meinardi.rrhh.domain.model.Permiso;
import com.meinardi.rrhh.domain.model.Rol;
import com.meinardi.rrhh.domain.model.Usuario;
import com.meinardi.rrhh.infrastructure.UsuarioRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class PasswordResetServiceTest {

  @Mock private UsuarioRepository usuarioRepository;
  @Mock private PasswordEncoder passwordEncoder;
  @Mock private EmailService emailService;

  private PasswordResetService passwordResetService;

  private Usuario testUsuario;
  private Rol testRol;

  @BeforeEach
  void setUp() {
    passwordResetService =
        new PasswordResetService(usuarioRepository, passwordEncoder, emailService);

    Permiso permiso = new Permiso("p1", "vacancies:read", "Read vacancies");
    testRol = new Rol("r1", "ADMIN", "Administrator", Set.of(permiso));
    testUsuario =
        new Usuario("u1", "admin@test.com", "hashed-password", "admin_user", testRol);
  }

  // --- generateResetToken ---

  @Test
  void generateResetTokenCreatesTokenAndStoresItOnUser() {
    when(usuarioRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(testUsuario));
    when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

    passwordResetService.generateResetToken("admin@test.com");

    ArgumentCaptor<Usuario> captor = ArgumentCaptor.forClass(Usuario.class);
    verify(usuarioRepository).save(captor.capture());
    Usuario saved = captor.getValue();
    assertThat(saved.getPasswordResetToken()).isNotBlank();
    assertThat(saved.getPasswordResetTokenExpiry()).isAfter(Instant.now());
  }

  @Test
  void generateResetTokenSendsEmailWithToken() {
    when(usuarioRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(testUsuario));
    when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

    passwordResetService.generateResetToken("admin@test.com");

    ArgumentCaptor<String> emailCaptor = ArgumentCaptor.forClass(String.class);
    ArgumentCaptor<String> tokenCaptor = ArgumentCaptor.forClass(String.class);
    verify(emailService).sendResetEmail(emailCaptor.capture(), tokenCaptor.capture());
    assertThat(emailCaptor.getValue()).isEqualTo("admin@test.com");
    assertThat(tokenCaptor.getValue()).isNotBlank();
  }

  @Test
  void generateResetTokenDoesNotThrowForUnknownEmail() {
    when(usuarioRepository.findByEmail("unknown@test.com")).thenReturn(Optional.empty());

    passwordResetService.generateResetToken("unknown@test.com");

    verify(usuarioRepository, never()).save(any());
    verify(emailService, never()).sendResetEmail(any(), any());
  }

  // --- validateResetToken ---

  @Test
  void validateResetTokenReturnsTrueForValidUnexpiredToken() {
    testUsuario.setPasswordResetToken("valid-token");
    testUsuario.setPasswordResetTokenExpiry(Instant.now().plus(1, ChronoUnit.HOURS));
    when(usuarioRepository.findByPasswordResetToken("valid-token"))
        .thenReturn(Optional.of(testUsuario));

    boolean result = passwordResetService.validateResetToken("valid-token");

    assertThat(result).isTrue();
  }

  @Test
  void validateResetTokenReturnsFalseForExpiredToken() {
    testUsuario.setPasswordResetToken("expired-token");
    testUsuario.setPasswordResetTokenExpiry(Instant.now().minus(1, ChronoUnit.HOURS));
    when(usuarioRepository.findByPasswordResetToken("expired-token"))
        .thenReturn(Optional.of(testUsuario));

    boolean result = passwordResetService.validateResetToken("expired-token");

    assertThat(result).isFalse();
  }

  @Test
  void validateResetTokenReturnsFalseForUnknownToken() {
    when(usuarioRepository.findByPasswordResetToken("unknown-token"))
        .thenReturn(Optional.empty());

    boolean result = passwordResetService.validateResetToken("unknown-token");

    assertThat(result).isFalse();
  }

  // --- resetPassword ---

  @Test
  void resetPasswordRotatesHashAndInvalidatesToken() {
    testUsuario.setPasswordResetToken("valid-token");
    testUsuario.setPasswordResetTokenExpiry(Instant.now().plus(1, ChronoUnit.HOURS));
    when(usuarioRepository.findByPasswordResetToken("valid-token"))
        .thenReturn(Optional.of(testUsuario));
    when(passwordEncoder.encode("new-password")).thenReturn("new-hashed-password");
    when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

    passwordResetService.resetPassword("valid-token", "new-password");

    ArgumentCaptor<Usuario> captor = ArgumentCaptor.forClass(Usuario.class);
    verify(usuarioRepository).save(captor.capture());
    Usuario saved = captor.getValue();
    assertThat(saved.getPassword()).isEqualTo("new-hashed-password");
    assertThat(saved.getPasswordResetToken()).isNull();
    assertThat(saved.getPasswordResetTokenExpiry()).isNull();
  }

  @Test
  void resetPasswordThrowsForExpiredToken() {
    testUsuario.setPasswordResetToken("expired-token");
    testUsuario.setPasswordResetTokenExpiry(Instant.now().minus(1, ChronoUnit.HOURS));
    when(usuarioRepository.findByPasswordResetToken("expired-token"))
        .thenReturn(Optional.of(testUsuario));

    assertThatThrownBy(() -> passwordResetService.resetPassword("expired-token", "new-password"))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("Expired");

    verify(usuarioRepository, never()).save(any());
  }

  @Test
  void resetPasswordThrowsForUnknownToken() {
    when(usuarioRepository.findByPasswordResetToken("unknown-token"))
        .thenReturn(Optional.empty());

    assertThatThrownBy(() -> passwordResetService.resetPassword("unknown-token", "new-password"))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("Invalid");

    verify(usuarioRepository, never()).save(any());
  }

  @Test
  void resetPasswordThrowsForAlreadyUsedToken() {
    testUsuario.setPasswordResetToken(null);
    testUsuario.setPasswordResetTokenExpiry(null);
    when(usuarioRepository.findByPasswordResetToken("used-token"))
        .thenReturn(Optional.of(testUsuario));

    assertThatThrownBy(() -> passwordResetService.resetPassword("used-token", "new-password"))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("Invalid");
  }
}
