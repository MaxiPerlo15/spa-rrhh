package com.meinardi.rrhh.infrastructure;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.meinardi.rrhh.application.ActivateVacancyInputBoundary;
import com.meinardi.rrhh.application.ApplicationAdminInputBoundary;
import com.meinardi.rrhh.application.AuditService;
import com.meinardi.rrhh.application.ApplicationIntakeInputBoundary;
import com.meinardi.rrhh.application.ApplicationListInputBoundary;
import com.meinardi.rrhh.application.CloseVacancyInputBoundary;
import com.meinardi.rrhh.application.CreateVacancyInputBoundary;
import com.meinardi.rrhh.application.DeactivateVacancyInputBoundary;
import com.meinardi.rrhh.application.GetVacancyInputBoundary;
import com.meinardi.rrhh.application.ListVacanciesInputBoundary;
import com.meinardi.rrhh.application.PasswordResetService;
import com.meinardi.rrhh.application.SessionService;
import com.meinardi.rrhh.application.UpdateVacancyInputBoundary;
import com.meinardi.rrhh.presentation.AuthController;
import com.meinardi.rrhh.domain.model.Permiso;
import com.meinardi.rrhh.domain.model.Rol;
import com.meinardi.rrhh.domain.model.Usuario;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
@SuppressWarnings("null")
class SecurityConfigTest {

  @Autowired private MockMvc mockMvc;

  @MockitoBean private SessionService sessionService;
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

  @Test
  void loginEndpointIsRegistered() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"test@test.com\",\"password\":\"pass\"}"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void meEndpointIsRegistered() throws Exception {
    mockMvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());
  }

  @Test
  void logoutEndpointIsRegistered() throws Exception {
    mockMvc.perform(post("/api/v1/auth/logout")).andExpect(status().isUnauthorized());
  }

  @Test
  void filterInstallsPermissionAuthoritiesAndClearsTheHolderAfterTheRequest() throws Exception {
    SessionService sessionService = mock(SessionService.class);
    Usuario usuario =
        new Usuario(
            "u1",
            "admin@test.com",
            "hashed-password",
            "admin_user",
            new Rol("r1", "ADMIN", "Administrator", Set.of(new Permiso("p1", "admin:access", "Admin access"))));
    when(sessionService.validateSession(org.mockito.ArgumentMatchers.any(HttpServletRequest.class), org.mockito.ArgumentMatchers.any(HttpServletResponse.class)))
        .thenReturn(Optional.of(usuario));
    SessionAuthenticationFilter filter = new SessionAuthenticationFilter(sessionService);
    HttpServletRequest request = mock(HttpServletRequest.class);
    HttpServletResponse response = mock(HttpServletResponse.class);
    FilterChain chain =
        (ignoredRequest, ignoredResponse) ->
            assertThat(SecurityContextHolder.getContext().getAuthentication().getAuthorities())
                .extracting("authority")
                .containsExactly("admin:access");

    filter.doFilter(request, response, chain);

    assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
  }

  @Test
  void recordsDeniedVacancyAndContactMutationsInSpring() {
    AuditService auditService = mock(AuditService.class);
    HttpServletRequest vacancyRequest = mock(HttpServletRequest.class);
    when(vacancyRequest.getMethod()).thenReturn("PATCH");
    when(vacancyRequest.getRequestURI()).thenReturn("/api/v1/vacancies/vacancy-1/close");
    when(vacancyRequest.getRemoteAddr()).thenReturn("127.0.0.1");
    HttpServletRequest contactRequest = mock(HttpServletRequest.class);
    when(contactRequest.getMethod()).thenReturn("DELETE");
    when(contactRequest.getRequestURI()).thenReturn("/api/v1/contacts/contact-1");
    when(contactRequest.getRemoteAddr()).thenReturn("127.0.0.1");

    SecurityConfig.recordDenied(vacancyRequest, auditService);
    SecurityConfig.recordDenied(contactRequest, auditService);

    org.mockito.Mockito.verify(auditService).recordDenied(org.mockito.ArgumentMatchers.eq("vacancy.close"), org.mockito.ArgumentMatchers.eq("vacancy"), org.mockito.ArgumentMatchers.eq("vacancy-1"), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    org.mockito.Mockito.verify(auditService).recordDenied(org.mockito.ArgumentMatchers.eq("contact.delete"), org.mockito.ArgumentMatchers.eq("contact"), org.mockito.ArgumentMatchers.eq("contact-1"), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
  }
}
