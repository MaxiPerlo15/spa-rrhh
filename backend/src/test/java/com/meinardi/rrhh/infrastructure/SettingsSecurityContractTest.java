package com.meinardi.rrhh.infrastructure;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.meinardi.rrhh.application.AdminSettingsService;
import com.meinardi.rrhh.application.AuditService;
import com.meinardi.rrhh.application.SessionService;
import com.meinardi.rrhh.domain.model.Permiso;
import com.meinardi.rrhh.domain.model.Rol;
import com.meinardi.rrhh.domain.model.Usuario;
import com.meinardi.rrhh.presentation.SettingsController;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(SettingsController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({SecurityConfig.class, SessionService.class})
@TestPropertySource(properties = {"rrhh.security.internal-api-token=test-token", "rrhh.security.allow-unauthenticated-vacancy-access=true", "rrhh.security.allow-unauthenticated-mutations=true"})
class SettingsSecurityContractTest {
  @Autowired private MockMvc mockMvc;
  @Autowired private SessionService sessionService;
  @MockitoBean private AdminSettingsService service;
  @MockitoBean private UsuarioRepository usuarioRepository;
  @MockitoBean private PasswordEncoder passwordEncoder;
  @MockitoBean private AuditService auditService;

  @Test
  void rejectsSettingsRequestsWithoutASpringSession() throws Exception {
    mockMvc.perform(get("/api/v1/admin/settings"))
        .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.error").value("unauthorized"));
  }

  @Test
  void admitsAnAdminSettingsRequestBackedByASpringSession() throws Exception {
    Usuario admin = admin();
    when(usuarioRepository.findById("admin-1")).thenReturn(Optional.of(admin));
    when(service.get("admin-1")).thenReturn(new AdminSettingsService.Settings(new AdminSettingsService.Profile("admin-1", "admin@example.com", "Admin", "ADMIN"), new AdminSettingsService.Preferences(true, true, false, true), "2026-07-24T12:00:00Z"));

    mockMvc.perform(get("/api/v1/admin/settings").session(sessionFor(admin)))
        .andExpect(status().isOk()).andExpect(jsonPath("$.profile.id").value("admin-1"));
  }

  @Test
  void permitsAnAuthenticatedSpringSessionToUpdateSettings() throws Exception {
    Usuario admin = admin();
    when(usuarioRepository.findById("admin-1")).thenReturn(Optional.of(admin));
    when(service.update("admin-1", new AdminSettingsService.Update(null, null, null, true, null)))
        .thenReturn(new AdminSettingsService.Settings(new AdminSettingsService.Profile("admin-1", "admin@example.com", "Admin", "ADMIN"), new AdminSettingsService.Preferences(true, true, true, true), "2026-07-24T12:00:00Z"));

    mockMvc.perform(put("/api/v1/admin/settings").session(sessionFor(admin)).contentType(MediaType.APPLICATION_JSON).content("{\"notifyNewContacts\":true}"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.preferences.notifyNewContacts").value(true));
  }

  @Test
  void rejectsNonAdminSpringSessionsWithTheForbiddenEnvelope() throws Exception {
    Usuario user = standardUser();
    when(usuarioRepository.findById("user-1")).thenReturn(Optional.of(user));

    mockMvc.perform(get("/api/v1/admin/settings").session(sessionFor(user)))
        .andExpect(status().isForbidden()).andExpect(content().json("{\"error\":\"forbidden\"}", true));

    mockMvc.perform(put("/api/v1/admin/settings").session(sessionFor(user)).contentType(MediaType.APPLICATION_JSON).content("{\"notifyNewContacts\":true}"))
        .andExpect(status().isForbidden()).andExpect(content().json("{\"error\":\"forbidden\"}", true));
  }

  private MockHttpSession sessionFor(Usuario usuario) {
    MockHttpServletRequest request = new MockHttpServletRequest();
    sessionService.createSession(request, usuario);
    return (MockHttpSession) request.getSession(false);
  }

  private Usuario admin() {
    return new Usuario("admin-1", "admin@example.com", "hash", "Admin", new Rol("role-1", "ADMIN", "Administrator", Set.of(new Permiso("permission-1", "admin:access", "Admin access"))));
  }

  private Usuario standardUser() {
    return new Usuario("user-1", "user@example.com", "hash", "User", new Rol("role-2", "USER", "User", Set.of()));
  }
}
