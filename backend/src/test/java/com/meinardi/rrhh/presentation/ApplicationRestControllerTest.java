package com.meinardi.rrhh.presentation;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.meinardi.rrhh.application.ApplicationAdminInputBoundary;
import com.meinardi.rrhh.application.ApplicationIntakeInputBoundary;
import com.meinardi.rrhh.application.ApplicationListInputBoundary;
import com.meinardi.rrhh.application.AuditService;
import com.meinardi.rrhh.application.SubmitApplicationCommand;
import com.meinardi.rrhh.domain.model.Candidato;
import com.meinardi.rrhh.domain.model.Jornada;
import com.meinardi.rrhh.domain.model.Modalidad;
import com.meinardi.rrhh.domain.model.Postulacion;
import com.meinardi.rrhh.domain.model.Ubicacion;
import com.meinardi.rrhh.domain.model.Vacante;
import com.meinardi.rrhh.infrastructure.SecurityConfig;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.context.annotation.Import;
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
class ApplicationRestControllerTest {

  private static final String VALID_TOKEN = "test-api-token-123";
  private static final String INVALID_TOKEN = "wrong-token";

  @Autowired private MockMvc mockMvc;

  @MockitoBean private ApplicationIntakeInputBoundary applicationIntakeInputBoundary;
  @MockitoBean private ApplicationListInputBoundary applicationListInputBoundary;
  @MockitoBean private ApplicationAdminInputBoundary applicationAdminInputBoundary;
  @MockitoBean private AuditService auditService;

  // --- POST /api/v1/applications ---

  @Test
  void postReturns201WithApplicationResponse() throws Exception {
    Postulacion postulacion = createActivePostulacion("app-123");

    when(applicationIntakeInputBoundary.submitApplication(any(SubmitApplicationCommand.class)))
        .thenReturn(postulacion);

    mockMvc
        .perform(
            post("/api/v1/applications")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "vacancyId": "v1",
                      "candidateName": "Juan Perez",
                      "email": "juan@test.com",
                      "phone": "+54123",
                      "coverLetter": "Cover letter"
                    }
                    """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.id").value("app-123"))
        .andExpect(jsonPath("$.status").value("PENDING"));

    verify(applicationIntakeInputBoundary)
        .submitApplication(any(SubmitApplicationCommand.class));
  }

  @Test
  void postReturns409WhenDuplicateDetected() throws Exception {
    when(applicationIntakeInputBoundary.submitApplication(any(SubmitApplicationCommand.class)))
        .thenThrow(
            new IllegalStateException(
                "Ya recibimos una postulación reciente para esta vacante."));

    mockMvc
        .perform(
            post("/api/v1/applications")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "vacancyId": "v1",
                      "candidateName": "Juan Perez",
                      "email": "juan@test.com",
                      "phone": "+54123"
                    }
                    """))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("DUPLICATE_SUBMISSION"))
        .andExpect(jsonPath("$.error", containsString("reciente")));
  }

  @Test
  void postReturns400WhenInvalidVacancy() throws Exception {
    when(applicationIntakeInputBoundary.submitApplication(any(SubmitApplicationCommand.class)))
        .thenThrow(new IllegalArgumentException("Esta vacante ya no está activa"));

    mockMvc
        .perform(
            post("/api/v1/applications")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "vacancyId": "nonexistent",
                      "candidateName": "Juan Perez",
                      "email": "juan@test.com",
                      "phone": "+54123"
                    }
                    """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").value("Esta vacante ya no está activa"));
  }

  @Test
  void postReturns400WhenRequiredFieldsMissing() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/applications")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"juan@test.com\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error", containsString("candidateName")));
  }

  @Test
  void postReturns400WhenRequestBodyIsInvalid() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/applications")
                .contentType(MediaType.APPLICATION_JSON)
                .content("not json"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").value("Request body is invalid"));
  }

  // --- GET /api/v1/applications ---

  @Test
  void getReturns403WhenNoApiKeyHeader() throws Exception {
    mockMvc.perform(get("/api/v1/applications")).andExpect(status().isForbidden());
  }

  @Test
  void getReturns403WhenInvalidApiKey() throws Exception {
    mockMvc
        .perform(get("/api/v1/applications").header("X-Backend-Api-Key", INVALID_TOKEN))
        .andExpect(status().isForbidden());
  }

  @Test
  void getReturns200WithValidApiKey() throws Exception {
    Postulacion p = createActivePostulacion("app-1");
    when(applicationListInputBoundary.listApplications(null, null, "Test + User", "candidateName", "asc"))
        .thenReturn(List.of(p));

    mockMvc
        .perform(
            get("/api/v1/applications")
                .header("X-Backend-Api-Key", VALID_TOKEN)
                .param("search", "Test + User")
                .param("sortBy", "candidateName")
                .param("sortDirection", "asc"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value("app-1"))
        .andExpect(jsonPath("$[0].candidateName").value("Test User"))
        .andExpect(jsonPath("$[0].status").value("PENDING"));
  }

  @Test
  void getReturns200WithVacancyFilter() throws Exception {
    Postulacion p = createActivePostulacion("app-1");
    when(applicationListInputBoundary.listApplications(eq("v1"), eq(null)))
        .thenReturn(List.of(p));

    mockMvc
        .perform(
            get("/api/v1/applications")
                .header("X-Backend-Api-Key", VALID_TOKEN)
                .param("vacancyId", "v1"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$").isArray())
        .andExpect(jsonPath("$[0].vacancy.id").value("v1"));

    verify(applicationListInputBoundary).listApplications(eq("v1"), eq(null));
  }

  @Test
  void getReturns200WithStatusFilter() throws Exception {
    Postulacion p = createActivePostulacion("app-1");
    when(applicationListInputBoundary.listApplications(eq(null), eq("PENDING")))
        .thenReturn(List.of(p));

    mockMvc
        .perform(
            get("/api/v1/applications")
                .header("X-Backend-Api-Key", VALID_TOKEN)
                .param("status", "PENDING"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].status").value("PENDING"));

    verify(applicationListInputBoundary).listApplications(eq(null), eq("PENDING"));
  }

  @Test
  void getReturns200EmptyArrayWhenNoApplications() throws Exception {
    when(applicationListInputBoundary.listApplications(null, null)).thenReturn(List.of());

    mockMvc
        .perform(
            get("/api/v1/applications").header("X-Backend-Api-Key", VALID_TOKEN))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$").isArray())
        .andExpect(jsonPath("$").isEmpty());
  }

  // --- GET /api/v1/applications/{id} security ---

  @Test
  void getDetailReturns403WhenNoApiKeyHeader() throws Exception {
    mockMvc.perform(get("/api/v1/applications/app-123")).andExpect(status().isForbidden());
  }

  @Test
  void getDetailReturns403WhenInvalidApiKey() throws Exception {
    mockMvc
        .perform(
            get("/api/v1/applications/app-123").header("X-Backend-Api-Key", INVALID_TOKEN))
        .andExpect(status().isForbidden());
  }

  // --- PATCH /api/v1/applications/{id}/status security ---

  @Test
  void patchStatusReturns403WhenNoApiKeyHeader() throws Exception {
    mockMvc
        .perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(
                    "/api/v1/applications/app-123/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"REVIEWING\"}"))
        .andExpect(status().isForbidden());
  }

  @Test
  void patchStatusReturns403WhenInvalidApiKey() throws Exception {
    mockMvc
        .perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(
                    "/api/v1/applications/app-123/status")
                .header("X-Backend-Api-Key", INVALID_TOKEN)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"REVIEWING\"}"))
        .andExpect(status().isForbidden());
  }

  // --- DELETE /api/v1/applications/{id} security ---

  @Test
  void deleteReturns403WhenNoApiKeyHeader() throws Exception {
    mockMvc
        .perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete(
                "/api/v1/applications/app-123"))
        .andExpect(status().isForbidden());
  }

  @Test
  void deleteReturns403WhenInvalidApiKey() throws Exception {
    mockMvc
        .perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete(
                    "/api/v1/applications/app-123")
                .header("X-Backend-Api-Key", INVALID_TOKEN))
        .andExpect(status().isForbidden());
  }

  // --- helper ---

  private Postulacion createActivePostulacion(String id) {
    Vacante vacancy = Vacante.create("Dev", "desc", "reqs",
        new Ubicacion("BA", "CABA"), Jornada.FULL_TIME, Modalidad.HYBRID);
    vacancy.setId("v1");
    vacancy.activar();

    Candidato candidato = Candidato.create("Test User", "test@test.com", "+54123", "cv.pdf");
    candidato.setId("c1");

    Postulacion p = Postulacion.createForVacancy(vacancy, candidato, "Cover");
    p.setId(id);
    p.setFechaPostulacion(OffsetDateTime.parse("2026-07-08T12:00:00Z"));
    return p;
  }
}
