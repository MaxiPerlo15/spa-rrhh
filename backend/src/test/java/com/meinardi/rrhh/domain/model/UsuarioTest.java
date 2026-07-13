package com.meinardi.rrhh.domain.model;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Set;
import org.junit.jupiter.api.Test;

class UsuarioTest {

  @Test
  void usuarioHasPasswordResetFields() {
    Permiso permiso = new Permiso(null, "vacancies:read", "Read vacancies");
    Rol rol = new Rol(null, "ADMIN", "Administrator", Set.of(permiso));

    Usuario usuario =
        new Usuario(null, "admin@test.com", "hashed-password", "admin_user", rol);

    assertThat(usuario.getPasswordResetToken()).isNull();
    assertThat(usuario.getPasswordResetTokenExpiry()).isNull();

    Instant expiry = Instant.now().plusSeconds(3600);
    usuario.setPasswordResetToken("reset-token-abc");
    usuario.setPasswordResetTokenExpiry(expiry);

    assertThat(usuario.getPasswordResetToken()).isEqualTo("reset-token-abc");
    assertThat(usuario.getPasswordResetTokenExpiry()).isEqualTo(expiry);
  }

  @Test
  void usuarioPasswordResetFieldsDefaultToNull() {
    Permiso permiso = new Permiso(null, "vacancies:read", "Read vacancies");
    Rol rol = new Rol(null, "ADMIN", "Administrator", Set.of(permiso));

    Usuario usuario =
        new Usuario(null, "admin@test.com", "hashed-password", "admin_user", rol);

    assertThat(usuario.getPasswordResetToken()).isNull();
    assertThat(usuario.getPasswordResetTokenExpiry()).isNull();
  }
}
