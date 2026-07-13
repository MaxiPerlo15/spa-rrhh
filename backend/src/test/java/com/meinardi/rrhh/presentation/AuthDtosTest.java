package com.meinardi.rrhh.presentation;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class AuthDtosTest {

  @Test
  void loginRequestHoldsEmailAndPassword() {
    var request = new LoginRequest("admin@test.com", "secret123");

    assertThat(request.email()).isEqualTo("admin@test.com");
    assertThat(request.password()).isEqualTo("secret123");
  }

  @Test
  void loginResponseHoldsUserFieldsAndRol() {
    var rol = new LoginResponse.RolDto("rol-1", "ADMIN", java.util.List.of("vacancies:read"));

    var response =
        new LoginResponse("user-1", "admin@test.com", "admin_user", rol);

    assertThat(response.userId()).isEqualTo("user-1");
    assertThat(response.email()).isEqualTo("admin@test.com");
    assertThat(response.nombreUsuario()).isEqualTo("admin_user");
    assertThat(response.rol().id()).isEqualTo("rol-1");
    assertThat(response.rol().nombre()).isEqualTo("ADMIN");
    assertThat(response.rol().permisos()).containsExactly("vacancies:read");
  }

  @Test
  void loginResponseRolDtoHasIdNombrePermisos() {
    var permisos = java.util.List.of("vacancies:read", "vacancies:write");
    var rol = new LoginResponse.RolDto("rol-1", "ADMIN", permisos);

    assertThat(rol.id()).isEqualTo("rol-1");
    assertThat(rol.nombre()).isEqualTo("ADMIN");
    assertThat(rol.permisos()).hasSize(2);
  }
}
