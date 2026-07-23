package com.meinardi.rrhh.presentation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.meinardi.rrhh.application.AuditFilters;
import com.meinardi.rrhh.application.AuditQuery;
import com.meinardi.rrhh.application.AuditService;
import com.meinardi.rrhh.domain.model.AdminAuditLog;
import com.meinardi.rrhh.domain.model.AuditOutcome;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.mockito.ArgumentCaptor;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AuditController.class)
@AutoConfigureMockMvc(addFilters = false)
class AuditControllerTest {
  @Autowired private MockMvc mockMvc;
  @MockitoBean private AuditService auditService;

  @Test
  void returnsDescendingAuditEntriesWithInclusiveUtcFiltersAndOptions() throws Exception {
    AdminAuditLog entry = AdminAuditLog.create("audit-1", "user-1", "admin@example.com", "vacancy.update", "vacancy", "vacancy-1", AuditOutcome.SUCCESS, "127.0.0.1", "test-agent", Map.of("source", "api"), OffsetDateTime.parse("2026-07-22T23:59:59Z"));
    when(auditService.list(any(AuditQuery.class), any())).thenReturn(new PageImpl<>(List.of(entry), PageRequest.of(1, 1), 3));
    when(auditService.filters()).thenReturn(new AuditFilters(List.of("contact.delete", "vacancy.update"), List.of("contact", "vacancy"), List.of("admin@example.com", "other@example.com")));

    mockMvc.perform(get("/api/v1/admin/audit?actorEmail=admin@example.com&action=vacancy.update&resourceType=vacancy&dateFrom=2026-07-22&dateTo=2026-07-22&page=2&limit=1"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items[0].id").value("audit-1"))
        .andExpect(jsonPath("$.items[0].createdAt").value("2026-07-22T23:59:59Z"))
        .andExpect(jsonPath("$.pagination.page").value(2))
        .andExpect(jsonPath("$.pagination.limit").value(1))
        .andExpect(jsonPath("$.pagination.total").value(3))
        .andExpect(jsonPath("$.pagination.totalPages").value(3))
        .andExpect(jsonPath("$.filters.actions[0]").value("contact.delete"))
        .andExpect(jsonPath("$.filters.resourceTypes[1]").value("vacancy"))
        .andExpect(jsonPath("$.filters.actorEmails[1]").value("other@example.com"));
    ArgumentCaptor<AuditQuery> query = ArgumentCaptor.forClass(AuditQuery.class); ArgumentCaptor<PageRequest> page = ArgumentCaptor.forClass(PageRequest.class);
    verify(auditService).list(query.capture(), page.capture());
    assertThat(query.getValue()).isEqualTo(new AuditQuery("admin@example.com", "vacancy.update", "vacancy", OffsetDateTime.parse("2026-07-22T00:00:00Z"), OffsetDateTime.parse("2026-07-22T23:59:59.999999999Z")));
    assertThat(page.getValue()).isEqualTo(PageRequest.of(1, 1));
  }

  @Test
  void rejectsInvalidPaginationAndInvertedUtcDates() throws Exception {
    mockMvc.perform(get("/api/v1/admin/audit?page=0&limit=51"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").exists());
    mockMvc.perform(get("/api/v1/admin/audit?dateFrom=2026-07-23&dateTo=2026-07-22"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").exists());
  }

  @Test
  void rejectsBlankAuditFiltersLikeTheNextValidationSchema() throws Exception {
    mockMvc.perform(get("/api/v1/admin/audit").param("actorEmail", " ").param("action", "").param("resourceType", "  "))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").exists());
  }

  @Test
  void retainsTheAuditErrorEnvelopeWhenListingFails() throws Exception {
    when(auditService.list(any(AuditQuery.class), any())).thenThrow(new IllegalStateException("database offline"));

    mockMvc.perform(get("/api/v1/admin/audit"))
        .andExpect(status().isInternalServerError())
        .andExpect(jsonPath("$.error").value("Internal server error"));
  }
}
