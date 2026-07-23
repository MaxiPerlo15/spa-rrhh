package com.meinardi.rrhh.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;

import com.meinardi.rrhh.application.AuditedVacancyCreator;
import com.meinardi.rrhh.application.AuditQuery;
import com.meinardi.rrhh.application.AuditService;
import com.meinardi.rrhh.application.CreateVacancyCommand;
import com.meinardi.rrhh.domain.model.AdminAuditLog;
import com.meinardi.rrhh.domain.model.AuditOutcome;
import com.meinardi.rrhh.domain.model.Jornada;
import com.meinardi.rrhh.domain.model.Modalidad;
import java.time.OffsetDateTime;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.aop.support.AopUtils;

@SpringBootTest(properties = {"spring.flyway.enabled=true", "spring.jpa.hibernate.ddl-auto=validate", "spring.datasource.driver-class-name=org.postgresql.Driver", "rrhh.security.internal-api-token=test-token"})
@AutoConfigureMockMvc(addFilters = false)
class AdminAuditLogRepositoryIntegrationTest {
  private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");
  static { POSTGRES.start(); }
  @DynamicPropertySource static void databaseProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
  }
  @Autowired private AdminAuditLogRepository repository;
  @Autowired private AuditService service;
  @Autowired private AuditedVacancyCreator auditedVacancyCreator;
  @Autowired private VacanteRepository vacanteRepository;
  @MockitoSpyBean private AuditService auditService;
  @Autowired private TransactionTemplate transactions;
  @BeforeEach void clearAudit() { repository.deleteAll(); }

  @Test
  void listsCompleteFiltersAndPagesInclusiveUtcBoundsInDescendingOrder() {
    repository.save(entry("early", "admin@example.com", "contact.delete", "contact", "2026-07-22T00:00:00Z"));
    repository.save(entry("middle", "other@example.com", "vacancy.update", "vacancy", "2026-07-22T12:00:00Z"));
    repository.save(entry("late", "admin@example.com", "vacancy.update", "vacancy", "2026-07-22T23:59:59Z"));
    repository.save(entry("outside", "2026-07-23T00:00:00Z", "vacancy.update"));

    var filtered = repository.list(new AuditQuery("admin@example.com", "vacancy.update", "vacancy", OffsetDateTime.parse("2026-07-22T00:00:00Z"), OffsetDateTime.parse("2026-07-22T23:59:59.999Z")), PageRequest.of(0, 1));
    var secondPage = repository.list(new AuditQuery(null, "vacancy.update", "vacancy", OffsetDateTime.parse("2026-07-22T00:00:00Z"), OffsetDateTime.parse("2026-07-22T23:59:59.999Z")), PageRequest.of(1, 1));

    assertThat(filtered.getContent()).extracting(AdminAuditLog::getId).containsExactly("late");
    assertThat(filtered.getTotalElements()).isEqualTo(1);
    assertThat(secondPage.getContent()).extracting(AdminAuditLog::getId).containsExactly("middle");
    assertThat(repository.filters()).isEqualTo(new com.meinardi.rrhh.application.AuditFilters(java.util.List.of("contact.delete", "vacancy.update"), java.util.List.of("contact", "vacancy"), java.util.List.of("admin@example.com", "other@example.com")));
  }

  @Test
  void keepsSuccessAtomicAndDeniedAndErrorDurableAcrossOuterRollback() {
    transactions.executeWithoutResult(status -> { service.recordSuccess("vacancy.update", "vacancy", "success", null, null, Map.of()); status.setRollbackOnly(); });
    assertThat(repository.list(new AuditQuery(null, null, null, null, null), PageRequest.of(0, 20)).getContent()).isEmpty();
    transactions.executeWithoutResult(status -> { service.recordDenied("contact.delete", "contact", "denied", null, null, Map.of()); service.recordError("application.view", "application", "error", null, null, Map.of()); status.setRollbackOnly(); });
    assertThat(repository.list(new AuditQuery(null, null, null, null, null), PageRequest.of(0, 20)).getContent()).extracting(AdminAuditLog::getOutcome).containsExactlyInAnyOrder(AuditOutcome.DENIED, AuditOutcome.ERROR);
  }

  @Test
  void springProxyRollsBackTheVacancyAndCommitsItsErrorAuditIndependently() {
    doThrow(new IllegalStateException("audit unavailable"))
        .when(auditService).recordSuccess(anyString(), anyString(), anyString(), any(), any(), any());

    assertThat(AopUtils.isAopProxy(auditedVacancyCreator)).isTrue();
    assertThatThrownBy(() -> auditedVacancyCreator.create(
        new CreateVacancyCommand("Reliability Engineer", "Keep services running", null, "Remote", "Remote", Jornada.FULL_TIME, Modalidad.REMOTE),
        "203.0.113.10", "browser-agent")).isInstanceOf(IllegalStateException.class);

    assertThat(vacanteRepository.findAll()).isEmpty();
    assertThat(repository.list(new AuditQuery(null, null, null, null, null), PageRequest.of(0, 20)).getContent())
        .extracting(AdminAuditLog::getOutcome).containsExactly(AuditOutcome.ERROR);
  }

  @Test
  void keepsAuditFieldsImmutableAfterCreation() {
    Map<String, Object> mutable = new java.util.HashMap<>(Map.of("source", "test")); AdminAuditLog entry = entry("immutable", "admin@example.com", "vacancy.update", "vacancy", "2026-07-22T00:00:00Z", mutable);
    mutable.put("source", "changed");
    assertThat(entry.getMetadata()).containsEntry("source", "test");
    assertThatThrownBy(() -> entry.getMetadata().put("source", "changed")).isInstanceOf(UnsupportedOperationException.class);
  }

  private AdminAuditLog entry(String id, String createdAt, String action) {
    return entry(id, "admin@example.com", action, "vacancy", createdAt);
  }
  private AdminAuditLog entry(String id, String email, String action, String resourceType, String createdAt) { return entry(id, email, action, resourceType, createdAt, Map.of("source", "test")); }
  private AdminAuditLog entry(String id, String email, String action, String resourceType, String createdAt, Map<String, Object> metadata) { return AdminAuditLog.create(id, "user-1", email, action, resourceType, resourceType + "-1", AuditOutcome.SUCCESS, "127.0.0.1", "agent", metadata, OffsetDateTime.parse(createdAt)); }
}
