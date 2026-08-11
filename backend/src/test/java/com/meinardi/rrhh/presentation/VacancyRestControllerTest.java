package com.meinardi.rrhh.presentation;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.meinardi.rrhh.application.ActivateVacancyInputBoundary;
import com.meinardi.rrhh.application.AuditedAdminMutation;
import com.meinardi.rrhh.application.AuditedVacancyCreator;
import com.meinardi.rrhh.application.CloseVacancyInputBoundary;
import com.meinardi.rrhh.application.DeactivateVacancyInputBoundary;
import com.meinardi.rrhh.application.GetVacancyInputBoundary;
import com.meinardi.rrhh.application.ListVacanciesInputBoundary;
import com.meinardi.rrhh.application.UpdateVacancyInputBoundary;
import com.meinardi.rrhh.domain.model.Jornada;
import com.meinardi.rrhh.domain.model.Modalidad;
import com.meinardi.rrhh.domain.model.Ubicacion;
import com.meinardi.rrhh.domain.model.Vacante;
import java.util.Map;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(VacancyRestController.class)
@AutoConfigureMockMvc(addFilters = false)
@SuppressWarnings("null")
class VacancyRestControllerTest {
  @Autowired private MockMvc mockMvc;
  @MockitoBean private AuditedVacancyCreator auditedVacancyCreator;
  @MockitoBean private GetVacancyInputBoundary getVacancy;
  @MockitoBean private UpdateVacancyInputBoundary updateVacancy;
  @MockitoBean private ActivateVacancyInputBoundary activateVacancy;
  @MockitoBean private DeactivateVacancyInputBoundary deactivateVacancy;
  @MockitoBean private CloseVacancyInputBoundary closeVacancy;
  @MockitoBean private ListVacanciesInputBoundary listVacancies;
  @MockitoBean private AuditedAdminMutation auditedMutation;

  @ParameterizedTest
  @ValueSource(strings = {"update", "activate", "deactivate", "close"})
  void wrapsVacancyMutationsWithResolvedRequestContext(String operation) throws Exception {
    Vacante vacancy = vacancy();
    when(auditedMutation.execute(any(), any(), any(), any(), any(), any(), any()))
        .thenAnswer(invocation -> ((java.util.function.Supplier<?>) invocation.getArgument(6)).get());
    switch (operation) {
      case "update" -> when(updateVacancy.updateVacancy(eq("vacancy-123"), any())).thenReturn(vacancy);
      case "activate" -> when(activateVacancy.activateVacancy("vacancy-123")).thenReturn(vacancy);
      case "deactivate" -> when(deactivateVacancy.deactivateVacancy("vacancy-123")).thenReturn(vacancy);
      case "close" -> when(closeVacancy.closeVacancy("vacancy-123")).thenReturn(vacancy);
      default -> throw new IllegalArgumentException("unsupported operation");
    }

    mockMvc
        .perform(
            patch("/api/v1/vacancies/vacancy-123" + suffix(operation))
                .contentType(MediaType.APPLICATION_JSON)
                .content(operation.equals("update") ? "{\"titulo\":\"Updated vacancy\"}" : "")
                .header("X-Forwarded-For", "203.0.113.10")
                .header("User-Agent", "vacancy-controller-test"))
        .andExpect(status().isOk());

    verify(auditedMutation)
        .execute(
            eq("vacancy." + operation),
            eq("vacancy"),
            eq("vacancy-123"),
            eq("203.0.113.10"),
            eq("vacancy-controller-test"),
            eq(Map.of()),
            any());
  }

  private String suffix(String operation) {
    return operation.equals("update") ? "" : "/" + operation;
  }

  private Vacante vacancy() {
    Vacante vacancy =
        Vacante.create(
            "Platform Engineer",
            "Keep systems running",
            null,
            new Ubicacion("Remote", "Remote"),
            Jornada.FULL_TIME,
            Modalidad.REMOTE);
    vacancy.setId("vacancy-123");
    return vacancy;
  }
}
