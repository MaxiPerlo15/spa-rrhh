package com.meinardi.rrhh.presentation;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.meinardi.rrhh.application.SessionService;
import com.meinardi.rrhh.domain.model.Permiso;
import com.meinardi.rrhh.domain.model.Rol;
import com.meinardi.rrhh.domain.model.Usuario;
import com.meinardi.rrhh.infrastructure.UsuarioRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
@SuppressWarnings("null")
class AuthControllerTest {

  @Autowired private MockMvc mockMvc;

  @MockitoBean private SessionService sessionService;
  @MockitoBean private UsuarioRepository usuarioRepository;
  @MockitoBean private PasswordEncoder passwordEncoder;

  private Usuario testUsuario;
  private Rol testRol;

  @BeforeEach
  void setUp() {
    Permiso permiso = new Permiso("p1", "vacancies:read", "Read vacancies");
    testRol = new Rol("r1", "ADMIN", "Administrator", Set.of(permiso));
    testUsuario =
        new Usuario("u1", "admin@test.com", "hashed-password", "admin_user", testRol);
  }

  // --- POST /api/v1/auth/login ---

  @Test
  void loginReturnsUserAndSetsSessionWhenCredentialsValid() throws Exception {
    when(usuarioRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(testUsuario));
    when(passwordEncoder.matches("secret123", "hashed-password")).thenReturn(true);

    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"admin@test.com\",\"password\":\"secret123\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.userId").value("u1"))
        .andExpect(jsonPath("$.email").value("admin@test.com"))
        .andExpect(jsonPath("$.nombreUsuario").value("admin_user"))
        .andExpect(jsonPath("$.rol.nombre").value("ADMIN"))
        .andExpect(jsonPath("$.rol.permisos[0]").value("vacancies:read"));

    verify(sessionService).createSession(any(HttpServletRequest.class), eq(testUsuario));
  }

  @Test
  void loginReturns401WhenPasswordIsInvalid() throws Exception {
    when(usuarioRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(testUsuario));
    when(passwordEncoder.matches("wrong-password", "hashed-password")).thenReturn(false);

    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"admin@test.com\",\"password\":\"wrong-password\"}"))
        .andExpect(status().isUnauthorized());

    verify(sessionService, never()).createSession(any(), any());
  }

  @Test
  void loginReturns401WhenEmailNotFound() throws Exception {
    when(usuarioRepository.findByEmail("unknown@test.com")).thenReturn(Optional.empty());

    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"unknown@test.com\",\"password\":\"any\"}"))
        .andExpect(status().isUnauthorized());

    verify(sessionService, never()).createSession(any(), any());
  }

  @Test
  void loginReturns400WhenEmailIsMissing() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"password\":\"secret123\"}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void loginReturns400WhenPasswordIsMissing() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"admin@test.com\"}"))
        .andExpect(status().isBadRequest());
  }

  // --- GET /api/v1/auth/me ---

  @Test
  void meReturnsCurrentUserWhenSessionValid() throws Exception {
    when(sessionService.validateSession(any(HttpServletRequest.class)))
        .thenReturn(Optional.of(testUsuario));

    mockMvc
        .perform(get("/api/v1/auth/me"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.userId").value("u1"))
        .andExpect(jsonPath("$.email").value("admin@test.com"))
        .andExpect(jsonPath("$.rol.id").value("r1"))
        .andExpect(jsonPath("$.rol.nombre").value("ADMIN"))
        .andExpect(jsonPath("$.rol.permisos[0]").value("vacancies:read"));
  }

  @Test
  void meReturns401WhenNoSession() throws Exception {
    when(sessionService.validateSession(any(HttpServletRequest.class)))
        .thenReturn(Optional.empty());

    mockMvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());
  }

  // --- POST /api/v1/auth/logout ---

  @Test
  void logoutReturns204AndInvalidatesSession() throws Exception {
    when(sessionService.validateSession(any(HttpServletRequest.class)))
        .thenReturn(Optional.of(testUsuario));

    mockMvc.perform(post("/api/v1/auth/logout")).andExpect(status().isNoContent());

    verify(sessionService).invalidateSession(any(HttpServletRequest.class));
  }

  @Test
  void logoutReturns401WhenNoSession() throws Exception {
    when(sessionService.validateSession(any(HttpServletRequest.class)))
        .thenReturn(Optional.empty());

    mockMvc.perform(post("/api/v1/auth/logout")).andExpect(status().isUnauthorized());

    verify(sessionService, never()).invalidateSession(any());
  }
}
