package com.meinardi.rrhh.presentation;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.meinardi.rrhh.application.HealthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(HealthController.class)
@AutoConfigureMockMvc(addFilters = false)
class HealthControllerTest {

  @Autowired private MockMvc mockMvc;

  @MockitoBean private HealthService healthService;

  @Test
  void returnsReadyWhenTheDatabaseCheckSucceeds() throws Exception {
    mockMvc
        .perform(get("/api/v1/health"))
        .andExpect(status().isOk())
        .andExpect(content().json("{\"status\":\"ok\",\"database\":\"ready\"}"));

    verify(healthService).checkDatabaseReadiness();
  }

  @Test
  void returnsUnavailableWhenTheDatabaseCheckFails() throws Exception {
    doThrow(new IllegalStateException("database unavailable"))
        .when(healthService)
        .checkDatabaseReadiness();

    mockMvc
        .perform(get("/api/v1/health"))
        .andExpect(status().isServiceUnavailable())
        .andExpect(content().json("{\"status\":\"error\",\"database\":\"unavailable\"}"));
  }
}
