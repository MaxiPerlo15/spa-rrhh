package com.meinardi.rrhh.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;

import com.meinardi.rrhh.application.ActivateVacancyInputBoundary;
import com.meinardi.rrhh.application.ApplicationAdminInputBoundary;
import com.meinardi.rrhh.application.ApplicationIntakeInputBoundary;
import com.meinardi.rrhh.application.ApplicationListInputBoundary;
import com.meinardi.rrhh.application.CloseVacancyInputBoundary;
import com.meinardi.rrhh.application.CreateVacancyInputBoundary;
import com.meinardi.rrhh.application.DeactivateVacancyInputBoundary;
import com.meinardi.rrhh.application.GetVacancyInputBoundary;
import com.meinardi.rrhh.application.ListVacanciesInputBoundary;
import com.meinardi.rrhh.application.NotificationService;
import com.meinardi.rrhh.application.AuditService;
import com.meinardi.rrhh.application.PasswordResetService;
import com.meinardi.rrhh.application.SessionService;
import com.meinardi.rrhh.application.UpdateVacancyInputBoundary;
import com.meinardi.rrhh.domain.model.Rol;
import com.meinardi.rrhh.domain.model.Usuario;
import com.meinardi.rrhh.presentation.ApplicationRestController;
import com.meinardi.rrhh.presentation.NotificationController;
import com.meinardi.rrhh.presentation.AuditController;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpSession;
import java.util.Optional;
import java.util.Set;

@WebMvcTest({ApplicationRestController.class, NotificationController.class, AuditController.class})
@AutoConfigureMockMvc(addFilters = true)
@Import({SecurityConfig.class, SessionService.class})
@TestPropertySource(
    properties = {
      "rrhh.security.internal-api-token=test-api-token-123",
      "rrhh.security.allow-unauthenticated-vacancy-access=true",
      "rrhh.security.allow-unauthenticated-mutations=true"
    })
@SuppressWarnings("null")
class SecurityConfigApplicationRoutesTest {

  private static final String VALID_TOKEN = "test-api-token-123";
  private static final String INVALID_TOKEN = "wrong-token";

  @Autowired private MockMvc mockMvc;

  @MockitoBean private com.meinardi.rrhh.infrastructure.UsuarioRepository usuarioRepository;
  @MockitoBean private PasswordEncoder passwordEncoder;
  @MockitoBean private CreateVacancyInputBoundary createVacancyInputBoundary;
  @MockitoBean private GetVacancyInputBoundary getVacancyInputBoundary;
  @MockitoBean private UpdateVacancyInputBoundary updateVacancyInputBoundary;
  @MockitoBean private ActivateVacancyInputBoundary activateVacancyInputBoundary;
  @MockitoBean private DeactivateVacancyInputBoundary deactivateVacancyInputBoundary;
  @MockitoBean private CloseVacancyInputBoundary closeVacancyInputBoundary;
  @MockitoBean private ListVacanciesInputBoundary listVacanciesInputBoundary;
  @MockitoBean private ApplicationIntakeInputBoundary applicationIntakeInputBoundary;
  @MockitoBean private ApplicationListInputBoundary applicationListInputBoundary;
  @MockitoBean private ApplicationAdminInputBoundary applicationAdminInputBoundary;
  @MockitoBean private PasswordResetService passwordResetService;
  @MockitoBean private NotificationService notificationService;
  @MockitoBean private AuditService auditService;
  @Autowired private SessionService sessionService;

  // --- GET /api/v1/applications/{id} ---

  @Test
  void getDetailReturns403WithoutApiKey() throws Exception {
    mockMvc
        .perform(get("/api/v1/applications/some-id"))
        .andExpect(status().isForbidden());
  }

  @Test
  void getDetailReturns403WithInvalidApiKey() throws Exception {
    mockMvc
        .perform(
            get("/api/v1/applications/some-id").header("X-Backend-Api-Key", INVALID_TOKEN))
        .andExpect(status().isForbidden());
  }

  // --- PATCH /api/v1/applications/{id}/status ---

  @Test
  void patchStatusReturns403WithoutApiKey() throws Exception {
    mockMvc
        .perform(
            patch("/api/v1/applications/some-id/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"REVIEWING\"}"))
        .andExpect(status().isForbidden());
  }

  @Test
  void patchStatusReturns403WithInvalidApiKey() throws Exception {
    mockMvc
        .perform(
            patch("/api/v1/applications/some-id/status")
                .header("X-Backend-Api-Key", INVALID_TOKEN)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"REVIEWING\"}"))
        .andExpect(status().isForbidden());
  }

  // --- DELETE /api/v1/applications/{id} ---

  @Test
  void deleteReturns403WithoutApiKey() throws Exception {
    mockMvc
        .perform(delete("/api/v1/applications/some-id"))
        .andExpect(status().isForbidden());
  }

  @Test
  void deleteReturns403WithInvalidApiKey() throws Exception {
    mockMvc
        .perform(
            delete("/api/v1/applications/some-id")
                .header("X-Backend-Api-Key", INVALID_TOKEN))
        .andExpect(status().isForbidden());
  }

  // --- GET /api/v1/applications (list) still works ---

  @Test
  void listReturns403WithoutApiKey() throws Exception {
    mockMvc
        .perform(get("/api/v1/applications"))
        .andExpect(status().isForbidden());
  }

  @Test
  void listReturns403WithInvalidApiKey() throws Exception {
    mockMvc
        .perform(
            get("/api/v1/applications").header("X-Backend-Api-Key", INVALID_TOKEN))
        .andExpect(status().isForbidden());
  }

  @Test
  void adminRouteReturnsJson401WhenThereIsNoValidSession() throws Exception {
    mockMvc
        .perform(get("/api/v1/admin/notifications"))
        .andExpect(status().isUnauthorized())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
        .andExpect(content().string("{\"error\":\"unauthorized\"}"));
  }

  @Test
  void adminRoleLabelWithoutThePermissionReturnsJson403() throws Exception {
    Usuario administratorWithoutPermission = administratorWithoutPermission();
    org.mockito.Mockito.when(usuarioRepository.findById("u1"))
        .thenReturn(Optional.of(administratorWithoutPermission));

    mockMvc
        .perform(get("/api/v1/admin/notifications").session(sessionFor(administratorWithoutPermission)))
        .andExpect(status().isForbidden())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
        .andExpect(content().string("{\"error\":\"forbidden\"}"));
  }

  @Test
  void permissionAuthorizedAdminReachesNotificationsThroughSecurityFilter() throws Exception {
    Usuario administrator = administrator();
    org.mockito.Mockito.when(usuarioRepository.findById("u1")).thenReturn(Optional.of(administrator));
    org.mockito.Mockito.when(notificationService.list(org.mockito.ArgumentMatchers.eq("all"), org.mockito.ArgumentMatchers.any(org.springframework.data.domain.Pageable.class)))
        .thenReturn(new org.springframework.data.domain.PageImpl<>(java.util.List.of()));
    mockMvc.perform(get("/api/v1/admin/notifications").session(sessionFor(administrator)))
        .andExpect(status().isOk())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
        .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.pagination.page").value(1));
  }

  @Test
  void auditRouteReturnsJson401WithoutASession() throws Exception {
    mockMvc.perform(get("/api/v1/admin/audit"))
        .andExpect(status().isUnauthorized())
        .andExpect(content().string("{\"error\":\"unauthorized\"}"));
  }

  @Test
  void auditRouteReturnsJson403WithoutAdminPermission() throws Exception {
    Usuario administrator = administratorWithoutPermission();
    org.mockito.Mockito.when(usuarioRepository.findById("u1")).thenReturn(Optional.of(administrator));

    mockMvc.perform(get("/api/v1/admin/audit").session(sessionFor(administrator)))
        .andExpect(status().isForbidden())
        .andExpect(content().string("{\"error\":\"forbidden\"}"));
  }

  @ParameterizedTest
  @ValueSource(strings = {"deleted", "disabled", "malformed", "fingerprint-stale"})
  void invalidSessionIsInvalidatedExpiresCookieAndReturnsJson401(String condition) throws Exception {
    MockHttpSession session = "malformed".equals(condition) ? new MockHttpSession() : sessionFor(administrator());
    if ("malformed".equals(condition)) {
      session.setAttribute("authenticatedUserId", "u1");
    } else if ("deleted".equals(condition)) {
      org.mockito.Mockito.when(usuarioRepository.findById("u1")).thenReturn(Optional.empty());
    } else {
      Usuario user = administrator();
      if ("disabled".equals(condition)) user.setEnabled(false);
      else user.setRol(new Rol("r1", "ADMIN", "Administrator", Set.of()));
      org.mockito.Mockito.when(usuarioRepository.findById("u1")).thenReturn(Optional.of(user));
    }
    assertInvalidSession(session);
  }

  private Usuario administrator() {
    return new Usuario(
        "u1",
        "admin@test.com",
        "password",
        "admin",
        new Rol(
            "r1",
            "ADMIN",
            "Administrator",
            Set.of(new com.meinardi.rrhh.domain.model.Permiso("p1", "admin:access", "Admin access"))));
  }

  private Usuario administratorWithoutPermission() {
    return new Usuario(
        "u1", "admin@test.com", "password", "admin", new Rol("r1", "ADMIN", "Administrator", Set.of()));
  }

  private MockHttpSession sessionFor(Usuario usuario) {
    MockHttpServletRequest request = new MockHttpServletRequest();
    sessionService.createSession(request, usuario);
    return (MockHttpSession) request.getSession(false);
  }

  private void assertInvalidSession(MockHttpSession session) throws Exception {
    mockMvc
        .perform(get("/api/v1/admin/notifications").session(session))
        .andExpect(status().isUnauthorized())
        .andExpect(content().string("{\"error\":\"unauthorized\"}"))
        .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("SESSIONID=")))
        .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("Max-Age=0")));
    assertThat(session.isInvalid()).isTrue();
  }
}
