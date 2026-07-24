package com.meinardi.rrhh.presentation;

import static org.assertj.core.api.Assertions.assertThat;

import com.meinardi.rrhh.application.AuditService;
import com.meinardi.rrhh.domain.model.*;
import com.meinardi.rrhh.infrastructure.CandidatoRepository;
import com.meinardi.rrhh.infrastructure.PostulacionRepository;
import com.meinardi.rrhh.infrastructure.VacanteRepository;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(
    properties = {
      "rrhh.security.internal-api-token=integration-test-token",
      "spring.datasource.url=jdbc:h2:mem:integrationtestdb;DB_CLOSE_DELAY=-1",
      "spring.jpa.hibernate.ddl-auto=create-drop"
    })
@SuppressWarnings("null")
class ApplicationRestControllerIntegrationTest {

  private static final String API_TOKEN = "integration-test-token";
  private static final String BASE = "/api/v1/applications";

  @Autowired private TestRestTemplate restTemplate;
  @Autowired private PostulacionRepository postulacionRepository;
  @Autowired private CandidatoRepository candidatoRepository;
  @Autowired private VacanteRepository vacanteRepository;

  @MockitoBean private AuditService auditService;

  private String savedAppId;

  @BeforeEach
  void setUp() {
    postulacionRepository.deleteAll();
    candidatoRepository.deleteAll();
    vacanteRepository.deleteAll();

    Vacante vacancy =
        Vacante.create(
            "Developer", "Backend", "Java",
            new Ubicacion("BA", "CABA"), Jornada.FULL_TIME, Modalidad.HYBRID);
    vacancy.activar();
    vacancy = vacanteRepository.save(vacancy);

    Candidato candidato =
        Candidato.create("Integration User", "int@test.com", "+54123", "cv.pdf");
    candidato = candidatoRepository.save(candidato);

    Postulacion postulacion = Postulacion.createForVacancy(vacancy, candidato, "Cover");
    postulacion.setSubmittedAt(OffsetDateTime.now());
    postulacion = postulacionRepository.save(postulacion);
    savedAppId = postulacion.getId();
  }

  private HttpHeaders authHeaders() {
    HttpHeaders headers = new HttpHeaders();
    headers.set("X-Backend-Api-Key", API_TOKEN);
    headers.setContentType(MediaType.APPLICATION_JSON);
    return headers;
  }

  // --- GET /api/v1/applications/{id} ---

  @Test
  void getDetailReturns200WithValidKey() {
    ResponseEntity<ApplicationDetailResponse> response =
        restTemplate.exchange(
            BASE + "/{id}",
            HttpMethod.GET,
            new HttpEntity<>(authHeaders()),
            ApplicationDetailResponse.class,
            savedAppId);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().id()).isEqualTo(savedAppId);
    assertThat(response.getBody().candidateName()).isEqualTo("Integration User");
    assertThat(response.getBody().email()).isEqualTo("int@test.com");
    assertThat(response.getBody().status()).isEqualTo("PENDING");
    assertThat(response.getBody().vacancy()).isNotNull();
    assertThat(response.getBody().vacancy().title()).isEqualTo("Developer");
  }

  @Test
  void getDetailReturns404WhenMissing() {
    ResponseEntity<String> response =
        restTemplate.exchange(
            BASE + "/{id}",
            HttpMethod.GET,
            new HttpEntity<>(authHeaders()),
            String.class,
            "nonexistent-id");

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
  }

  @Test
  void getDetailReturns403WithoutApiKey() {
    ResponseEntity<String> response =
        restTemplate.exchange(
            BASE + "/{id}",
            HttpMethod.GET,
            new HttpEntity<>(new HttpHeaders()),
            String.class,
            savedAppId);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
  }

  // --- PATCH /api/v1/applications/{id}/status ---

  @Test
  void patchStatusReturns200OnValidTransition() {
    String body = "{\"status\":\"REVIEWING\"}";
    ResponseEntity<ApplicationDetailResponse> response =
        restTemplate.exchange(
            BASE + "/{id}/status",
            HttpMethod.PATCH,
            new HttpEntity<>(body, authHeaders()),
            ApplicationDetailResponse.class,
            savedAppId);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().status()).isEqualTo("REVIEWING");
  }

  @Test
  void patchStatusReturns400OnInvalidTransition() {
    String body = "{\"status\":\"INTERVIEWED\"}";
    ResponseEntity<String> response =
        restTemplate.exchange(
            BASE + "/{id}/status",
            HttpMethod.PATCH,
            new HttpEntity<>(body, authHeaders()),
            String.class,
            savedAppId);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
  }

  @Test
  void patchStatusReturns409OnSameState() {
    // First move to REVIEWING so same-state check applies
    String body = "{\"status\":\"REVIEWING\"}";
    restTemplate.exchange(
        BASE + "/{id}/status",
        HttpMethod.PATCH,
        new HttpEntity<>(body, authHeaders()),
        String.class,
        savedAppId);

    // Now try same-state
    ResponseEntity<String> response =
        restTemplate.exchange(
            BASE + "/{id}/status",
            HttpMethod.PATCH,
            new HttpEntity<>(body, authHeaders()),
            String.class,
            savedAppId);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
  }

  @Test
  void patchStatusReturns404WhenMissing() {
    String body = "{\"status\":\"REVIEWING\"}";
    ResponseEntity<String> response =
        restTemplate.exchange(
            BASE + "/{id}/status",
            HttpMethod.PATCH,
            new HttpEntity<>(body, authHeaders()),
            String.class,
            "nonexistent-id");

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
  }

  @Test
  void patchStatusReturns403WithoutApiKey() {
    String body = "{\"status\":\"REVIEWING\"}";
    ResponseEntity<String> response =
        restTemplate.exchange(
            BASE + "/{id}/status",
            HttpMethod.PATCH,
            new HttpEntity<>(body, new HttpHeaders()),
            String.class,
            savedAppId);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
  }

  // --- DELETE /api/v1/applications/{id} ---

  @Test
  void deleteReturns200OnSuccess() {
    ResponseEntity<String> response =
        restTemplate.exchange(
            BASE + "/{id}",
            HttpMethod.DELETE,
            new HttpEntity<>(authHeaders()),
            String.class,
            savedAppId);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(response.getBody()).contains("true");
    assertThat(postulacionRepository.findById(savedAppId)).isEmpty();
  }

  @Test
  void deleteReturns404WhenMissing() {
    ResponseEntity<String> response =
        restTemplate.exchange(
            BASE + "/{id}",
            HttpMethod.DELETE,
            new HttpEntity<>(authHeaders()),
            String.class,
            "nonexistent-id");

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
  }

  @Test
  void deleteReturns403WithoutApiKey() {
    ResponseEntity<String> response =
        restTemplate.exchange(
            BASE + "/{id}",
            HttpMethod.DELETE,
            new HttpEntity<>(new HttpHeaders()),
            String.class,
            savedAppId);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
  }
}
