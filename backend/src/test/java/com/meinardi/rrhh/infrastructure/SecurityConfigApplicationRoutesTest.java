package com.meinardi.rrhh.infrastructure;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.meinardi.rrhh.application.ActivateVacancyInputBoundary;
import com.meinardi.rrhh.application.ApplicationAdminInputBoundary;
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
import com.meinardi.rrhh.presentation.ApplicationRestController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ApplicationRestController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import(SecurityConfig.class)
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
}
