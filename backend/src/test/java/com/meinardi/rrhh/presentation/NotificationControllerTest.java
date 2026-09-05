package com.meinardi.rrhh.presentation;

import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.meinardi.rrhh.application.NotificationService;
import com.meinardi.rrhh.domain.model.AdminNotification;
import com.meinardi.rrhh.domain.model.NotificationLevel;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(NotificationController.class)
@AutoConfigureMockMvc(addFilters = false)
class NotificationControllerTest {
  @Autowired private MockMvc mockMvc;
  @MockitoBean private NotificationService notificationService;

  @Test
  void returnsPaginatedNotificationDtos() throws Exception {
    AdminNotification notification = AdminNotification.create("n1", "Nuevo CV", "Ana aplicó", NotificationLevel.SUCCESS, "Ver", "VACANCY", "v1");
    when(notificationService.list("unread", PageRequest.of(1, 10))).thenReturn(new PageImpl<>(List.of(notification), PageRequest.of(1, 10), 11));

    mockMvc.perform(get("/api/v1/admin/notifications?view=unread&page=2&limit=10"))
        .andExpect(status().isOk())
        .andExpect(content().json("{\"items\":[{\"id\":\"n1\",\"level\":\"success\",\"isRead\":false}],\"pagination\":{\"page\":2,\"limit\":10,\"total\":11,\"totalPages\":2}}"));
  }

  @Test
  void rejectsAnInvalidBulkDeleteViewWithoutDeletingReadNotifications() throws Exception {
    mockMvc.perform(delete("/api/v1/admin/notifications?view=unread"))
        .andExpect(status().isBadRequest())
        .andExpect(content().json("{\"error\":\"Parámetro view inválido\"}"));

    verifyNoInteractions(notificationService);
  }

  @Test
  void rejectsUnknownBulkDeleteViewsWithoutCallingTheDeletionService() throws Exception {
    mockMvc.perform(delete("/api/v1/admin/notifications?view=archived"))
        .andExpect(status().isBadRequest())
        .andExpect(content().json("{\"error\":\"Parámetro view inválido\"}"));

    verifyNoInteractions(notificationService);
  }
}
