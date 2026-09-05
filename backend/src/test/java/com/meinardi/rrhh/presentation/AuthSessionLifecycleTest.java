package com.meinardi.rrhh.presentation;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.meinardi.rrhh.application.AuditService;
import com.meinardi.rrhh.application.SessionService;
import com.meinardi.rrhh.domain.model.Permiso;
import com.meinardi.rrhh.domain.model.Rol;
import com.meinardi.rrhh.domain.model.Usuario;
import com.meinardi.rrhh.infrastructure.SecurityConfig;
import com.meinardi.rrhh.infrastructure.UsuarioRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import(SecurityConfig.class)
@TestPropertySource(
    properties = {
      "rrhh.security.allow-unauthenticated-vacancy-access=true",
      "rrhh.security.allow-unauthenticated-mutations=true"
    })
@SuppressWarnings("null")
class AuthSessionLifecycleTest {

  @Autowired private MockMvc mockMvc;

  @MockitoBean private SessionService sessionService;
  @MockitoBean private AuditService auditService;
  @MockitoBean private UsuarioRepository usuarioRepository;
  @MockitoBean private PasswordEncoder passwordEncoder;

  private Usuario administrator;

  @BeforeEach
  void setUp() {
    administrator =
        new Usuario(
            "u1",
            "admin@test.com",
            "hashed-password",
            "admin",
            new Rol(
                "r1",
                "ADMIN",
                "Administrator",
                Set.of(new Permiso("p1", "admin:access", "Admin access"))));
  }

  @Test
  void meUsesTheFilterValidatedSessionWithoutRevalidatingIt() throws Exception {
    when(sessionService.validateSession(any(HttpServletRequest.class), any(HttpServletResponse.class)))
        .thenReturn(Optional.of(administrator));

    mockMvc
        .perform(get("/api/v1/auth/me"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.userId").value("u1"));
  }

  @Test
  void logoutUsesTheFilterValidatedSessionAndForwardsCookieClearing() throws Exception {
    when(sessionService.validateSession(any(HttpServletRequest.class), any(HttpServletResponse.class)))
        .thenReturn(Optional.of(administrator), Optional.empty());
    doAnswer(
            invocation -> {
              invocation
                  .getArgument(1, HttpServletResponse.class)
                  .addHeader("Set-Cookie", "SESSIONID=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
              return null;
            })
        .when(sessionService)
        .invalidateSession(any(HttpServletRequest.class), any(HttpServletResponse.class));

    mockMvc
        .perform(post("/api/v1/auth/logout"))
        .andExpect(status().isNoContent())
        .andExpect(header().string("Set-Cookie", containsString("SESSIONID=;")))
        .andExpect(header().string("Set-Cookie", containsString("Max-Age=0")));
  }
}
