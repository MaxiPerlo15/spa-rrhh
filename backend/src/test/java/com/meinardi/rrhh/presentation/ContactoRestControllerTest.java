package com.meinardi.rrhh.presentation;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.meinardi.rrhh.application.AuditedAdminMutation;
import com.meinardi.rrhh.application.ContactoService;
import com.meinardi.rrhh.domain.model.Contacto;
import java.util.Map;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ContactoRestController.class)
@AutoConfigureMockMvc(addFilters = false)
@SuppressWarnings("null")
class ContactoRestControllerTest {

  @Autowired private MockMvc mockMvc;
  @MockitoBean private ContactoService contactoService;
  @MockitoBean private AuditedAdminMutation auditedMutation;

  @ParameterizedTest
  @ValueSource(strings = {"PATCH", "DELETE"})
  void authorizedContactMutationMapsActionContextAndMetadataThroughAuditedMutation(String method)
      throws Exception {
    Contacto contact =
        Contacto.create("Contact", "contact@example.com", "+541111", "Subject", "Message", "key");
    when(auditedMutation.execute(any(), any(), any(), any(), any(), any(), any()))
        .thenAnswer(invocation -> ((java.util.function.Supplier<?>) invocation.getArgument(6)).get());
    if ("PATCH".equals(method)) {
      when(contactoService.updateStatus("contact-123", "RESPONDED")).thenReturn(contact);
    }

    mockMvc
        .perform(
            "PATCH".equals(method)
                ? patch("/api/v1/contacts/contact-123")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"status\":\"RESPONDED\"}")
                    .header("X-Forwarded-For", "203.0.113.10")
                    .header("User-Agent", "contact-controller-test")
                : delete("/api/v1/contacts/contact-123")
                    .header("X-Forwarded-For", "203.0.113.10")
                    .header("User-Agent", "contact-controller-test"))
        .andExpect(status().isOk());

    verify(auditedMutation)
        .execute(
            eq("PATCH".equals(method) ? "contact.update_status" : "contact.delete"),
            eq("contact"),
            eq("contact-123"),
            eq("203.0.113.10"),
            eq("contact-controller-test"),
            eq("PATCH".equals(method) ? Map.of("newStatus", "RESPONDED") : Map.of()),
            any());
    if ("PATCH".equals(method)) {
      verify(contactoService).updateStatus("contact-123", "RESPONDED");
    } else {
      verify(contactoService).delete("contact-123");
    }
  }
}
