package com.meinardi.rrhh.presentation;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.meinardi.rrhh.application.AdminSettingsService;
import com.meinardi.rrhh.domain.model.Rol;
import com.meinardi.rrhh.domain.model.Usuario;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(SettingsController.class)
@AutoConfigureMockMvc(addFilters = true)
class SettingsControllerTest {
  @Autowired private MockMvc mockMvc;
  @MockitoBean private AdminSettingsService service;

  @Test
  void returnsTheSettingsJsonForTheAuthenticatedAdministrator() throws Exception {
    when(service.get("admin-1")).thenReturn(settings("Admin"));

    mockMvc.perform(get("/api/v1/admin/settings").with(adminAuthentication()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.profile.id").value("admin-1"))
        .andExpect(jsonPath("$.profile.name").value("Admin"))
        .andExpect(jsonPath("$.preferences.notifyNewContacts").value(false))
        .andExpect(jsonPath("$.backend.springVacanciesEnabled").value(true))
        .andExpect(jsonPath("$.updatedAt").value("2026-07-24T12:00:00Z"));
  }

  @Test
  void updatesSettingsFromJson() throws Exception {
    AdminSettingsService.Update update = new AdminSettingsService.Update("Updated Admin", false, null, true, null);
    when(service.update("admin-1", update)).thenReturn(settings("Updated Admin"));

    mockMvc.perform(put("/api/v1/admin/settings").with(adminAuthentication()).with(csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Updated Admin\",\"notificationsEnabled\":false,\"notifyNewContacts\":true}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.profile.name").value("Updated Admin"))
        .andExpect(jsonPath("$.preferences.notificationsEnabled").value(true));

    verify(service).update("admin-1", update);
  }

  @Test
  void rejectsEmptyAndBlankUpdates() throws Exception {
    mockMvc.perform(put("/api/v1/admin/settings").with(adminAuthentication()).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{}"))
        .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("Datos inválidos"));
    mockMvc.perform(put("/api/v1/admin/settings").with(adminAuthentication()).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"  \"}"))
        .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("Datos inválidos"));
  }

  @Test
  void rejectsMalformedJson() throws Exception {
    mockMvc.perform(put("/api/v1/admin/settings").with(adminAuthentication()).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"name\":"))
        .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("Malformed request body"));
  }

  @Test
  void preservesNotFoundAndUnexpectedErrorEnvelopes() throws Exception {
    when(service.get("admin-1")).thenThrow(new java.util.NoSuchElementException("Usuario no encontrado"));
    mockMvc.perform(get("/api/v1/admin/settings").with(adminAuthentication()))
        .andExpect(status().isNotFound()).andExpect(jsonPath("$.error").value("Usuario no encontrado"));

    org.mockito.Mockito.doThrow(new IllegalStateException("database offline")).when(service).get("admin-1");
    mockMvc.perform(get("/api/v1/admin/settings").with(adminAuthentication()))
        .andExpect(status().isInternalServerError()).andExpect(jsonPath("$.error").value("Internal server error"));
  }

  private org.springframework.test.web.servlet.request.RequestPostProcessor adminAuthentication() {
    return authentication(new UsernamePasswordAuthenticationToken(admin(), null, List.of(new SimpleGrantedAuthority("admin:access"))));
  }

  private Usuario admin() {
    return new Usuario("admin-1", "admin@example.com", "hash", "Admin", new Rol("role-1", "ADMIN", "Administrator", Set.of()));
  }

  private AdminSettingsService.Settings settings(String name) {
    return new AdminSettingsService.Settings(new AdminSettingsService.Profile("admin-1", "admin@example.com", name, "ADMIN"), new AdminSettingsService.Preferences(true, true, false, true), "2026-07-24T12:00:00Z");
  }
}
