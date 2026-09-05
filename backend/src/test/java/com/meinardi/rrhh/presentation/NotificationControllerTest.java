package com.meinardi.rrhh.presentation;

import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.meinardi.rrhh.application.NotificationNotFoundException;
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
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(NotificationController.class)
@AutoConfigureMockMvc(addFilters = false)
class NotificationControllerTest {
  @Autowired private MockMvc mockMvc;
  @MockitoBean private NotificationService notificationService;

  @Test
  void returnsPaginatedNotificationDtos() throws Exception {
    AdminNotification notification =
        AdminNotification.create(
            "n1", "Nuevo CV", "Ana aplicó", NotificationLevel.SUCCESS, "Ver", "VACANCY", "v1");
    when(notificationService.list("unread", PageRequest.of(1, 10)))
        .thenReturn(new PageImpl<>(List.of(notification), PageRequest.of(1, 10), 11));

    mockMvc
        .perform(get("/api/v1/admin/notifications?view=unread&page=2&limit=10"))
        .andExpect(status().isOk())
        .andExpect(
            content()
                .json(
                    "{\"items\":[{\"id\":\"n1\",\"level\":\"success\",\"isRead\":false}],\"pagination\":{\"page\":2,\"limit\":10,\"total\":11,\"totalPages\":2}}"));
  }

  @Test
  void rejectsAnInvalidBulkDeleteViewWithoutDeletingReadNotifications() throws Exception {
    mockMvc
        .perform(delete("/api/v1/admin/notifications?view=unread"))
        .andExpect(status().isBadRequest())
        .andExpect(content().json("{\"error\":\"Parámetro view inválido\"}"));

    verifyNoInteractions(notificationService);
  }

  @Test
  void rejectsUnknownBulkDeleteViewsWithoutCallingTheDeletionService() throws Exception {
    mockMvc
        .perform(delete("/api/v1/admin/notifications?view=archived"))
        .andExpect(status().isBadRequest())
        .andExpect(content().json("{\"error\":\"Parámetro view inválido\"}"));

    verifyNoInteractions(notificationService);
  }

  @Test
  void createsAndReturnsTheNotificationDto() throws Exception {
    AdminNotification notification =
        AdminNotification.create(
            "n1", "New application", "Ana applied", NotificationLevel.SUCCESS, "View", "APPLICATION", "a1");
    when(notificationService.create(
            "New application", "Ana applied", NotificationLevel.SUCCESS, "View", "APPLICATION", "a1"))
        .thenReturn(notification);

    mockMvc
        .perform(
            post("/api/v1/admin/notifications")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"title\":\"New application\",\"message\":\"Ana applied\",\"level\":\"SUCCESS\",\"action\":{\"label\":\"View\",\"type\":\"APPLICATION\",\"resourceId\":\"a1\"}}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.id").value("n1"))
        .andExpect(jsonPath("$.level").value("success"))
        .andExpect(jsonPath("$.action.type").value("APPLICATION"));
  }

  @Test
  void updatesReadStateAndReturns404ForMissingNotifications() throws Exception {
    AdminNotification notification =
        AdminNotification.create(
            "n1", "New application", "Ana applied", NotificationLevel.INFO, null, null, null);
    notification.setRead(true);
    when(notificationService.updateReadState("n1", true)).thenReturn(notification);
    when(notificationService.updateReadState("missing", false))
        .thenThrow(new NotificationNotFoundException());

    mockMvc
        .perform(
            patch("/api/v1/admin/notifications/n1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"isRead\":true}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value("n1"))
        .andExpect(jsonPath("$.isRead").value(true));
    mockMvc
        .perform(
            patch("/api/v1/admin/notifications/missing")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"isRead\":false}"))
        .andExpect(status().isNotFound())
        .andExpect(content().json("{\"error\":\"Notificación no encontrada\"}"));
  }

  @Test
  void deletesSingleAndBulkNotificationsAndReturns404ForMissingIds() throws Exception {
    when(notificationService.delete("read")).thenReturn(2L);
    doThrow(new NotificationNotFoundException()).when(notificationService).deleteOne("missing");

    mockMvc
        .perform(delete("/api/v1/admin/notifications?view=read"))
        .andExpect(status().isOk())
        .andExpect(content().json("{\"deletedCount\":2}"));
    mockMvc
        .perform(delete("/api/v1/admin/notifications/n1"))
        .andExpect(status().isOk())
        .andExpect(content().json("{\"message\":\"Notificación eliminada\"}"));
    mockMvc
        .perform(delete("/api/v1/admin/notifications/missing"))
        .andExpect(status().isNotFound())
        .andExpect(content().json("{\"error\":\"Notificación no encontrada\"}"));
  }

  @Test
  void returnsErrorEnvelopesForValidationAndUnexpectedFailures() throws Exception {
    when(notificationService.list("all", PageRequest.of(0, 20)))
        .thenThrow(new IllegalStateException("database offline"));

    mockMvc
        .perform(
            post("/api/v1/admin/notifications")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"\",\"message\":\"\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath(
                "$.error",
                allOf(
                    containsString("title: must not be blank"),
                    containsString("message: must not be blank"))));
    mockMvc
        .perform(get("/api/v1/admin/notifications"))
        .andExpect(status().isInternalServerError())
        .andExpect(content().json("{\"error\":\"Internal server error\"}"));
  }

  @Test
  void rejectsPartialAndMalformedActionsWithoutCallingTheCreationService() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/admin/notifications")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"title\":\"New application\",\"message\":\"Ana applied\",\"action\":{\"label\":\"View\",\"resourceId\":\"a1\"}}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").exists());
    mockMvc
        .perform(
            post("/api/v1/admin/notifications")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"title\":\"New application\",\"message\":\"Ana applied\",\"action\":\"view\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").exists());
    verifyNoInteractions(notificationService);
  }
}
