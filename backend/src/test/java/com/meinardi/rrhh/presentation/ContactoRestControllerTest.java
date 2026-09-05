package com.meinardi.rrhh.presentation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.meinardi.rrhh.application.AuditedAdminMutation;
import com.meinardi.rrhh.application.ContactoService;
import com.meinardi.rrhh.domain.model.Contacto;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import java.util.function.Supplier;
import org.junit.jupiter.api.Test;

class ContactoRestControllerTest {
  @Test
  @SuppressWarnings("unchecked")
  void recordsContactStatusSuccessWithAllowlistedRequestContext() {
    ContactoService contacts = mock(ContactoService.class);
    AuditedAdminMutation audits = mock(AuditedAdminMutation.class);
    Contacto contacto = Contacto.create("Contact", "contact@example.com", "+541111", "Subject", "Message", "contact-key");
    HttpServletRequest request = mock(HttpServletRequest.class);
    when(request.getHeader("X-Forwarded-For")).thenReturn("203.0.113.10");
    when(request.getHeader("User-Agent")).thenReturn("contact-admin-test");
    when(contacts.updateStatus("contact-1", "RESPONDED")).thenReturn(contacto);
    when(audits.execute(eq("contact.update_status"), eq("contact"), eq("contact-1"), eq("203.0.113.10"), eq("contact-admin-test"), eq(Map.of("newStatus", "RESPONDED")), any(Supplier.class)))
        .thenAnswer(invocation -> ((Supplier<Contacto>) invocation.getArgument(6)).get());

    ContactResponse response = new ContactoRestController(contacts, audits)
        .updateStatus("contact-1", Map.of("status", "RESPONDED"), request);

    assertThat(response.status()).isEqualTo("PENDING");
    verify(audits).execute(eq("contact.update_status"), eq("contact"), eq("contact-1"), eq("203.0.113.10"), eq("contact-admin-test"), eq(Map.of("newStatus", "RESPONDED")), any(Supplier.class));
  }
}
