package com.meinardi.rrhh.presentation;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.meinardi.rrhh.application.CandidateAdminService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(CandidateRestController.class)
@AutoConfigureMockMvc(addFilters = false)
@SuppressWarnings("null")
class CandidateRestControllerTest {

  @Autowired private MockMvc mockMvc;

  @MockitoBean private CandidateAdminService candidateAdminService;

  @Test
  void create_returns201WithCandidateIdAndApplicationId() throws Exception {
    when(candidateAdminService.manualCreate("Maria", "maria@test.com", "+54 11 9999-0000", "Notes"))
        .thenReturn(new CandidateAdminService.CreateResult("cand-1", "app-1"));

    mockMvc
        .perform(
            post("/api/v1/candidates")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"candidateName\":\"Maria\",\"email\":\"maria@test.com\",\"phone\":\"+54 11 9999-0000\",\"notes\":\"Notes\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.candidateId").value("cand-1"))
        .andExpect(jsonPath("$.applicationId").value("app-1"));
  }

  @Test
  void create_returns409OnDuplicateCandidate() throws Exception {
    when(candidateAdminService.manualCreate(any(), any(), any(), any()))
        .thenThrow(new IllegalArgumentException("DUPLICATE_CANDIDATE"));

    mockMvc
        .perform(
            post("/api/v1/candidates")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"candidateName\":\"Maria\",\"email\":\"maria@test.com\",\"phone\":\"+54 11 9999-0000\"}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("DUPLICATE_CANDIDATE"));
  }

  @Test
  void update_returns200WithCandidateId() throws Exception {
    when(candidateAdminService.updateIdentity("cand-1", "Maria G.", "new@test.com", "+54 11 1111-2222"))
        .thenReturn(new CandidateAdminService.UpdateResult("cand-1"));

    mockMvc
        .perform(
            patch("/api/v1/candidates/cand-1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"candidateName\":\"Maria G.\",\"email\":\"new@test.com\",\"phone\":\"+54 11 1111-2222\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.candidateId").value("cand-1"));
  }

  @Test
  void update_returns409OnIdentityConflict() throws Exception {
    when(candidateAdminService.updateIdentity(any(), any(), any(), any()))
        .thenThrow(new IllegalArgumentException("CANDIDATE_IDENTITY_CONFLICT"));

    mockMvc
        .perform(
            patch("/api/v1/candidates/cand-1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"candidateName\":\"Maria\",\"email\":\"conflict@test.com\",\"phone\":\"+54 11 0000-0000\"}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("CANDIDATE_IDENTITY_CONFLICT"));
  }

  @Test
  void update_returns404WhenCandidateNotFound() throws Exception {
    when(candidateAdminService.updateIdentity(any(), any(), any(), any()))
        .thenThrow(new IllegalArgumentException("Candidate not found"));

    mockMvc
        .perform(
            patch("/api/v1/candidates/missing-id")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"candidateName\":\"Maria\",\"email\":\"a@b.com\",\"phone\":\"123\"}"))
        .andExpect(status().isNotFound());
  }
}
