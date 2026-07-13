package com.meinardi.rrhh.presentation;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.meinardi.rrhh.application.PasswordResetService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(PasswordResetController.class)
@AutoConfigureMockMvc(addFilters = false)
@SuppressWarnings("null")
class PasswordResetControllerTest {

  @Autowired private MockMvc mockMvc;

  @MockitoBean private PasswordResetService passwordResetService;

  // --- POST /api/v1/auth/forgot-password ---

  @Test
  void forgotPasswordReturns200WithGenericMessage() throws Exception {
    doNothing().when(passwordResetService).generateResetToken("admin@test.com");

    mockMvc
        .perform(
            post("/api/v1/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"admin@test.com\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.message").value("If the email exists, a reset link has been sent."));

    verify(passwordResetService).generateResetToken("admin@test.com");
  }

  @Test
  void forgotPasswordReturns200EvenForUnknownEmail() throws Exception {
    doNothing().when(passwordResetService).generateResetToken("unknown@test.com");

    mockMvc
        .perform(
            post("/api/v1/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"unknown@test.com\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.message").value("If the email exists, a reset link has been sent."));
  }

  @Test
  void forgotPasswordReturns400WhenEmailIsMissing() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void forgotPasswordReturns400WhenEmailIsInvalid() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"not-an-email\"}"))
        .andExpect(status().isBadRequest());
  }

  // --- POST /api/v1/auth/reset-password ---

  @Test
  void resetPasswordReturns200OnSuccess() throws Exception {
    doNothing().when(passwordResetService).resetPassword("valid-token", "new-password123");

    mockMvc
        .perform(
            post("/api/v1/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"valid-token\",\"password\":\"new-password123\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.message").value("Password has been reset successfully."));
  }

  @Test
  void resetPasswordReturns400ForExpiredToken() throws Exception {
    doThrow(new IllegalArgumentException("Expired reset token"))
        .when(passwordResetService)
        .resetPassword("expired-token", "new-password123");

    mockMvc
        .perform(
            post("/api/v1/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"expired-token\",\"password\":\"new-password123\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").value("Expired reset token"));
  }

  @Test
  void resetPasswordReturns400ForInvalidToken() throws Exception {
    doThrow(new IllegalArgumentException("Invalid reset token"))
        .when(passwordResetService)
        .resetPassword("invalid-token", "new-password123");

    mockMvc
        .perform(
            post("/api/v1/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"invalid-token\",\"password\":\"new-password123\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").value("Invalid reset token"));
  }

  @Test
  void resetPasswordReturns400WhenTokenIsMissing() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"password\":\"new-password123\"}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void resetPasswordReturns400WhenPasswordIsMissing() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"valid-token\"}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void resetPasswordReturns400WhenPasswordTooShort() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"valid-token\",\"password\":\"ab\"}"))
        .andExpect(status().isBadRequest());

    verify(passwordResetService, never()).resetPassword(anyString(), anyString());
  }
}
