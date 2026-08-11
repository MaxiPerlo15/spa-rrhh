package com.meinardi.rrhh.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import com.meinardi.rrhh.application.AuditedAdminMutation;
import com.meinardi.rrhh.application.AuditedCandidateAdmin;
import com.meinardi.rrhh.application.AuditedVacancyCreator;
import com.meinardi.rrhh.application.ContactoService;
import com.meinardi.rrhh.application.PasswordResetService;
import com.meinardi.rrhh.application.SessionService;
import com.meinardi.rrhh.application.UpdateVacancyInputBoundary;
import com.meinardi.rrhh.domain.model.Rol;
import com.meinardi.rrhh.domain.model.Usuario;
import com.meinardi.rrhh.presentation.ApplicationRestController;
import com.meinardi.rrhh.presentation.NotificationController;
import com.meinardi.rrhh.presentation.AuditController;
import com.meinardi.rrhh.presentation.CandidateRestController;
import com.meinardi.rrhh.presentation.ContactoRestController;
import com.meinardi.rrhh.presentation.VacancyRestController;
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

@WebMvcTest({ApplicationRestController.class, CandidateRestController.class, ContactoRestController.class, NotificationController.class, AuditController.class, VacancyRestController.class})
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
  @MockitoBean private AuditedAdminMutation auditedAdminMutation;
  @MockitoBean private AuditedVacancyCreator auditedVacancyCreator;
  @MockitoBean private AuditedCandidateAdmin auditedCandidateAdmin;
  @MockitoBean private ContactoService contactoService;
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

  @Test
  void candidateCreateDenialIsRecordedInSpring() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/candidates")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"candidateName\":\"Maria\",\"email\":\"maria@test.com\",\"phone\":\"+54 11 9999-0000\"}"))
        .andExpect(status().isUnauthorized())
        .andExpect(content().string("{\"error\":\"unauthorized\"}"));

    org.mockito.Mockito.verify(auditService)
        .recordDenied(
            org.mockito.ArgumentMatchers.eq("candidate.create"),
            org.mockito.ArgumentMatchers.eq("candidate"),
            org.mockito.ArgumentMatchers.isNull(),
            org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.any());
  }

  @Test
  void candidateCreateWithNoAdminPermissionReturnsJson403AndRecordsDeniedInSpring()
      throws Exception {
    Usuario user = administratorWithoutPermission();
    org.mockito.Mockito.when(usuarioRepository.findById("u1")).thenReturn(Optional.of(user));

    mockMvc
        .perform(
            post("/api/v1/candidates")
                .session(sessionFor(user))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"candidateName\":\"Maria\",\"email\":\"maria@test.com\",\"phone\":\"+54 11 9999-0000\"}"))
        .andExpect(status().isForbidden())
        .andExpect(content().string("{\"error\":\"forbidden\"}"));

    org.mockito.Mockito.verify(auditService)
        .recordDenied(
            org.mockito.ArgumentMatchers.eq("candidate.create"),
            org.mockito.ArgumentMatchers.eq("candidate"),
            org.mockito.ArgumentMatchers.isNull(),
            org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.eq(java.util.Map.of("reason", "forbidden")));
    org.mockito.Mockito.verifyNoInteractions(auditedCandidateAdmin);
  }

  @Test
  void candidateUpdateDenialIsRecordedInSpring() throws Exception {
    mockMvc
        .perform(
            patch("/api/v1/candidates/candidate-123")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"candidateName\":\"Maria\",\"email\":\"maria@test.com\",\"phone\":\"+54 11 9999-0000\"}"))
        .andExpect(status().isUnauthorized())
        .andExpect(content().string("{\"error\":\"unauthorized\"}"));

    org.mockito.Mockito.verify(auditService)
        .recordDenied(
            org.mockito.ArgumentMatchers.eq("candidate.update"),
            org.mockito.ArgumentMatchers.eq("candidate"),
            org.mockito.ArgumentMatchers.eq("candidate-123"),
            org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.any());
  }

  @Test
  void candidateUpdateWithNoAdminPermissionReturnsJson403AndRecordsDeniedInSpring()
      throws Exception {
    Usuario user = administratorWithoutPermission();
    org.mockito.Mockito.when(usuarioRepository.findById("u1")).thenReturn(Optional.of(user));

    mockMvc
        .perform(
            patch("/api/v1/candidates/candidate-123")
                .session(sessionFor(user))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"candidateName\":\"Maria\",\"email\":\"maria@test.com\",\"phone\":\"+54 11 9999-0000\"}"))
        .andExpect(status().isForbidden())
        .andExpect(content().string("{\"error\":\"forbidden\"}"));

    org.mockito.Mockito.verify(auditService)
        .recordDenied(
            org.mockito.ArgumentMatchers.eq("candidate.update"),
            org.mockito.ArgumentMatchers.eq("candidate"),
            org.mockito.ArgumentMatchers.eq("candidate-123"),
            org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.any());
    org.mockito.Mockito.verifyNoInteractions(auditedCandidateAdmin);
  }

  @Test
  void anonymousVacancyCreateReturnsJson401RecordsDeniedAndDoesNotMutate() throws Exception {
    mockMvc
        .perform(vacancyCreate())
        .andExpect(status().isUnauthorized())
        .andExpect(content().string("{\"error\":\"unauthorized\"}"));

    org.mockito.Mockito.verify(auditService)
        .recordDenied(
            org.mockito.ArgumentMatchers.eq("vacancy.create"),
            org.mockito.ArgumentMatchers.eq("vacancy"),
            org.mockito.ArgumentMatchers.isNull(),
            org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.eq(java.util.Map.of("reason", "forbidden")));
    org.mockito.Mockito.verifyNoInteractions(auditedVacancyCreator);
  }

  @Test
  void forbiddenVacancyCreateReturnsJson403RecordsForwardedContextAndDoesNotMutate()
      throws Exception {
    Usuario user = administratorWithoutPermission();
    org.mockito.Mockito.when(usuarioRepository.findById("u1")).thenReturn(Optional.of(user));

    mockMvc
        .perform(
            vacancyCreate()
                .session(sessionFor(user))
                .header("X-Forwarded-For", "203.0.113.10")
                .header("User-Agent", "vacancy-post-test"))
        .andExpect(status().isForbidden())
        .andExpect(content().string("{\"error\":\"forbidden\"}"));

    org.mockito.Mockito.verify(auditService)
        .recordDenied(
            org.mockito.ArgumentMatchers.eq("vacancy.create"),
            org.mockito.ArgumentMatchers.eq("vacancy"),
            org.mockito.ArgumentMatchers.isNull(),
            org.mockito.ArgumentMatchers.eq("203.0.113.10"),
            org.mockito.ArgumentMatchers.eq("vacancy-post-test"),
            org.mockito.ArgumentMatchers.eq(java.util.Map.of("reason", "forbidden")));
    org.mockito.Mockito.verifyNoInteractions(auditedVacancyCreator);
  }

  @ParameterizedTest
  @ValueSource(strings = {"", "/activate", "/deactivate"})
  void anonymousVacancyDetailMutationReturnsJson401RecordsDeniedAndDoesNotMutate(String suffix)
      throws Exception {
    mockMvc
        .perform(vacancyDetailMutation(suffix))
        .andExpect(status().isUnauthorized())
        .andExpect(content().string("{\"error\":\"unauthorized\"}"));

    org.mockito.Mockito.verify(auditService)
        .recordDenied(
            org.mockito.ArgumentMatchers.eq(vacancyAction(suffix)),
            org.mockito.ArgumentMatchers.eq("vacancy"),
            org.mockito.ArgumentMatchers.eq("vacancy-123"),
            org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.eq(java.util.Map.of("reason", "forbidden")));
    org.mockito.Mockito.verifyNoInteractions(auditedAdminMutation);
  }

  @ParameterizedTest
  @ValueSource(strings = {"", "/activate", "/deactivate"})
  void forbiddenVacancyDetailMutationReturnsJson403RecordsContextAndDoesNotMutate(String suffix)
      throws Exception {
    Usuario user = administratorWithoutPermission();
    org.mockito.Mockito.when(usuarioRepository.findById("u1")).thenReturn(Optional.of(user));

    mockMvc
        .perform(
            vacancyDetailMutation(suffix)
                .session(sessionFor(user))
                .header("X-Forwarded-For", "203.0.113.10")
                .header("User-Agent", "vacancy-detail-test"))
        .andExpect(status().isForbidden())
        .andExpect(content().string("{\"error\":\"forbidden\"}"));

    org.mockito.Mockito.verify(auditService)
        .recordDenied(
            org.mockito.ArgumentMatchers.eq(vacancyAction(suffix)),
            org.mockito.ArgumentMatchers.eq("vacancy"),
            org.mockito.ArgumentMatchers.eq("vacancy-123"),
            org.mockito.ArgumentMatchers.eq("203.0.113.10"),
            org.mockito.ArgumentMatchers.eq("vacancy-detail-test"),
            org.mockito.ArgumentMatchers.eq(java.util.Map.of("reason", "forbidden")));
    org.mockito.Mockito.verifyNoInteractions(auditedAdminMutation);
  }

  @ParameterizedTest
  @ValueSource(strings = {"PATCH", "DELETE"})
  void anonymousContactMutationReturnsJson401AndRecordsDeniedInSpring(String method) throws Exception {
    mockMvc
        .perform(contactMutation(method))
        .andExpect(status().isUnauthorized())
        .andExpect(content().string("{\"error\":\"unauthorized\"}"));

    org.mockito.Mockito.verify(auditService)
        .recordDenied(
            org.mockito.ArgumentMatchers.eq("PATCH".equals(method) ? "contact.update_status" : "contact.delete"),
            org.mockito.ArgumentMatchers.eq("contact"),
            org.mockito.ArgumentMatchers.eq("contact-123"),
            org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.any());
    org.mockito.Mockito.verifyNoInteractions(contactoService, auditedAdminMutation);
  }

  @ParameterizedTest
  @ValueSource(strings = {"PATCH", "DELETE"})
  void anonymousContactMutationRecordsValidForwardedAuditContext(String method) throws Exception {
    mockMvc
        .perform(
            contactMutation(method)
                .header("X-Forwarded-For", "203.0.113.10")
                .header("User-Agent", "BFF test agent"))
        .andExpect(status().isUnauthorized())
        .andExpect(content().string("{\"error\":\"unauthorized\"}"));

    org.mockito.Mockito.verify(auditService)
        .recordDenied(
            org.mockito.ArgumentMatchers.eq("PATCH".equals(method) ? "contact.update_status" : "contact.delete"),
            org.mockito.ArgumentMatchers.eq("contact"),
            org.mockito.ArgumentMatchers.eq("contact-123"),
            org.mockito.ArgumentMatchers.eq("203.0.113.10"),
            org.mockito.ArgumentMatchers.eq("BFF test agent"),
            org.mockito.ArgumentMatchers.eq(java.util.Map.of("reason", "forbidden")));
  }

  @ParameterizedTest
  @ValueSource(strings = {"PATCH", "DELETE"})
  void contactMutationWithAdminDelegatesThroughAuditedMutation(String method) throws Exception {
    Usuario administrator = administrator();
    org.mockito.Mockito.when(usuarioRepository.findById("u1")).thenReturn(Optional.of(administrator));
    org.mockito.Mockito.doAnswer(invocation -> ((java.util.function.Supplier<?>) invocation.getArgument(6)).get())
        .when(auditedAdminMutation).execute(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.nullable(String.class), org.mockito.ArgumentMatchers.anyMap(), org.mockito.ArgumentMatchers.any());
    if ("PATCH".equals(method)) org.mockito.Mockito.when(contactoService.updateStatus("contact-123", "RESPONDED")).thenReturn(org.mockito.Mockito.mock(com.meinardi.rrhh.domain.model.Contacto.class));

    mockMvc
        .perform(
            contactMutation(method)
                .session(sessionFor(administrator))
                .header("X-Forwarded-For", "203.0.113.10")
                .header("User-Agent", "BFF test agent"))
        .andExpect(status().isOk());

    org.mockito.Mockito.verify(auditedAdminMutation).execute(
        org.mockito.ArgumentMatchers.eq("PATCH".equals(method) ? "contact.update_status" : "contact.delete"), org.mockito.ArgumentMatchers.eq("contact"), org.mockito.ArgumentMatchers.eq("contact-123"), org.mockito.ArgumentMatchers.eq("203.0.113.10"), org.mockito.ArgumentMatchers.eq("BFF test agent"), org.mockito.ArgumentMatchers.anyMap(), org.mockito.ArgumentMatchers.any());
    if ("PATCH".equals(method)) org.mockito.Mockito.verify(contactoService).updateStatus("contact-123", "RESPONDED");
    else org.mockito.Mockito.verify(contactoService).delete("contact-123");
  }

  @ParameterizedTest
  @ValueSource(strings = {"PATCH", "DELETE"})
  void contactMutationWithMalformedAndOversizedHeadersSanitizesSuccessfulAuditContext(String method) throws Exception {
    Usuario administrator = administrator();
    org.mockito.Mockito.when(usuarioRepository.findById("u1")).thenReturn(Optional.of(administrator));
    org.mockito.Mockito.doAnswer(invocation -> ((java.util.function.Supplier<?>) invocation.getArgument(6)).get())
        .when(auditedAdminMutation).execute(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.nullable(String.class), org.mockito.ArgumentMatchers.nullable(String.class), org.mockito.ArgumentMatchers.anyMap(), org.mockito.ArgumentMatchers.any());
    if ("PATCH".equals(method)) org.mockito.Mockito.when(contactoService.updateStatus("contact-123", "RESPONDED")).thenReturn(org.mockito.Mockito.mock(com.meinardi.rrhh.domain.model.Contacto.class));

    mockMvc
        .perform(
            contactMutation(method)
                .session(sessionFor(administrator))
                .with(request -> { request.setRemoteAddr("10.0.0.4"); return request; })
                .header("X-Forwarded-For", "203.0.113.+10")
                .header("User-Agent", "a".repeat(513)))
        .andExpect(status().isOk());

    org.mockito.Mockito.verify(auditedAdminMutation).execute(
        org.mockito.ArgumentMatchers.eq("PATCH".equals(method) ? "contact.update_status" : "contact.delete"), org.mockito.ArgumentMatchers.eq("contact"), org.mockito.ArgumentMatchers.eq("contact-123"), org.mockito.ArgumentMatchers.eq("10.0.0.4"), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.anyMap(), org.mockito.ArgumentMatchers.any());
  }

  @ParameterizedTest
  @ValueSource(strings = {"PATCH", "DELETE"})
  void contactMutationWithoutAdminPermissionReturnsJson403(String method) throws Exception {
    Usuario administrator = administratorWithoutPermission();
    org.mockito.Mockito.when(usuarioRepository.findById("u1")).thenReturn(Optional.of(administrator));

    mockMvc
        .perform(
            contactMutation(method)
                .session(sessionFor(administrator))
                .with(request -> { request.setRemoteAddr("10.0.0.4"); return request; })
                .header("X-Forwarded-For", "203.0.113.+10")
                .header("User-Agent", "a".repeat(513)))
        .andExpect(status().isForbidden())
        .andExpect(content().string("{\"error\":\"forbidden\"}"));

    org.mockito.Mockito.verify(auditService)
        .recordDenied(
            org.mockito.ArgumentMatchers.eq("PATCH".equals(method) ? "contact.update_status" : "contact.delete"),
            org.mockito.ArgumentMatchers.eq("contact"),
            org.mockito.ArgumentMatchers.eq("contact-123"),
            org.mockito.ArgumentMatchers.eq("10.0.0.4"),
            org.mockito.ArgumentMatchers.isNull(),
            org.mockito.ArgumentMatchers.eq(java.util.Map.of("reason", "forbidden")));
    org.mockito.Mockito.verifyNoInteractions(contactoService, auditedAdminMutation);
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

  private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder contactMutation(String method) {
    return "PATCH".equals(method)
        ? patch("/api/v1/contacts/contact-123").contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"RESPONDED\"}")
        : delete("/api/v1/contacts/contact-123");
  }

  private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder vacancyCreate() {
    return post("/api/v1/vacancies")
        .contentType(MediaType.APPLICATION_JSON)
        .content(
            "{\"titulo\":\"Platform Engineer\",\"descripcion\":\"Build reliable systems\",\"ubicacionNombre\":\"Remote\",\"jornada\":\"FULL_TIME\",\"modalidad\":\"REMOTE\"}");
  }

  private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder vacancyDetailMutation(
      String suffix) {
    return patch("/api/v1/vacancies/vacancy-123" + suffix)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"titulo\":\"Updated vacancy\"}");
  }

  private String vacancyAction(String suffix) {
    return switch (suffix) {
      case "/activate" -> "vacancy.activate";
      case "/deactivate" -> "vacancy.deactivate";
      default -> "vacancy.update";
    };
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
