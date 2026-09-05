package com.meinardi.rrhh.presentation;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.meinardi.rrhh.application.ActivateVacancyInputBoundary;
import com.meinardi.rrhh.application.AuditedVacancyCreator;
import com.meinardi.rrhh.application.AuditedAdminMutation;
import com.meinardi.rrhh.application.CloseVacancyInputBoundary;
import com.meinardi.rrhh.application.CreateVacancyCommand;
import com.meinardi.rrhh.application.DeactivateVacancyInputBoundary;
import com.meinardi.rrhh.application.GetVacancyInputBoundary;
import com.meinardi.rrhh.application.ListVacanciesInputBoundary;
import com.meinardi.rrhh.application.UpdateVacancyCommand;
import com.meinardi.rrhh.application.UpdateVacancyInputBoundary;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(VacancyRestController.class)
@AutoConfigureMockMvc(addFilters = false)
@SuppressWarnings("null")
class VacancyExceptionHandlerTest {
  @Autowired private MockMvc mockMvc;

  @MockitoBean private AuditedVacancyCreator auditedVacancyCreator;
  @MockitoBean private AuditedAdminMutation auditedMutation;
  @MockitoBean private GetVacancyInputBoundary getVacancyInputBoundary;
  @MockitoBean private UpdateVacancyInputBoundary updateVacancyInputBoundary;
  @MockitoBean private ActivateVacancyInputBoundary activateVacancyInputBoundary;
  @MockitoBean private DeactivateVacancyInputBoundary deactivateVacancyInputBoundary;
  @MockitoBean private CloseVacancyInputBoundary closeVacancyInputBoundary;
  @MockitoBean private ListVacanciesInputBoundary listVacanciesInputBoundary;

  @BeforeEach
  void passThroughAuditedMutations() {
    lenient()
        .doAnswer(invocation -> ((java.util.function.Supplier<?>) invocation.getArgument(6)).get())
        .when(auditedMutation)
        .execute(
            any(), any(), any(), nullable(String.class), nullable(String.class), any(), any());
  }

  @Test
  void getVacancyReturnsNotFoundWhenVacancyDoesNotExist() throws Exception {
    when(getVacancyInputBoundary.getVacancy("missing"))
        .thenThrow(new EntityNotFoundException("vacancy not found"));

    mockMvc
        .perform(get("/api/v1/vacancies/missing"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.error").value("vacancy not found"));
  }

  @Test
  void activateVacancyReturnsConflictWhenBusinessRuleFails() throws Exception {
    doThrow(new IllegalStateException("La vacante ya se encuentra activa"))
        .when(auditedMutation)
        .execute(
            eq("vacancy.activate"), eq("vacancy"), eq("vacancy-id"), nullable(String.class),
            nullable(String.class), any(), any());

    mockMvc
        .perform(patch("/api/v1/vacancies/vacancy-id/activate"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.error").value("La vacante ya se encuentra activa"));
  }

  @Test
  void createVacancyReturnsBadRequestWhenCommandIsInvalid() throws Exception {
    String requestBody =
        """
        {
          "titulo": "Developer",
          "descripcion": "Backend role",
          "ubicacionNombre": "Remote",
          "jornada": "FULL_TIME",
          "modalidad": "REMOTE"
        }
        """;

    when(auditedVacancyCreator.create(any(CreateVacancyCommand.class), any(), any()))
        .thenThrow(new IllegalArgumentException("titulo is required"));

    mockMvc
        .perform(post("/api/v1/vacancies").contentType(MediaType.APPLICATION_JSON).content(requestBody))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").value("titulo is required"));
  }

  @Test
  void updateVacancyReturnsBadRequestWhenCommandIsInvalid() throws Exception {
    doThrow(new IllegalArgumentException("descripcion is required"))
        .when(auditedMutation)
        .execute(
            eq("vacancy.update"), eq("vacancy"), eq("vacancy-id"), nullable(String.class),
            nullable(String.class), any(), any());

    mockMvc
        .perform(
            patch("/api/v1/vacancies/vacancy-id")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").value("descripcion is required"));
  }

  @Test
  void createVacancyReturnsNormalizedValidationErrorWhenRequestIsInvalid() throws Exception {
    String requestBody =
        """
        {
          "descripcion": "Backend role",
          "ubicacionNombre": "Remote",
          "jornada": "FULL_TIME",
          "modalidad": "REMOTE"
        }
        """;

    mockMvc
        .perform(post("/api/v1/vacancies").contentType(MediaType.APPLICATION_JSON).content(requestBody))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").value(containsString("titulo")));
  }

  @Test
  void updateVacancyReturnsNormalizedErrorWhenRequestBodyCannotBeParsed() throws Exception {
    mockMvc
        .perform(
            patch("/api/v1/vacancies/vacancy-id")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"jornada\":\"INVALID\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").value("Request body is invalid"));
  }
}
