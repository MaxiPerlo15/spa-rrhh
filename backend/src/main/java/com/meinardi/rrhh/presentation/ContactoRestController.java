package com.meinardi.rrhh.presentation;

import com.meinardi.rrhh.application.ContactoService;
import com.meinardi.rrhh.application.AuditedAdminMutation;
import com.meinardi.rrhh.domain.model.Contacto;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/contacts")
public class ContactoRestController {

  private final ContactoService contactoService;
  private final AuditedAdminMutation auditedMutation;

  public ContactoRestController(ContactoService contactoService, AuditedAdminMutation auditedMutation) {
    this.contactoService = contactoService;
    this.auditedMutation = auditedMutation;
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ContactResponse submit(@Valid @RequestBody ContactRequest request) {
    Contacto contacto =
        contactoService.submit(
            request.name(), request.email(), request.phone(), request.subject(), request.message());
    return toResponse(contacto);
  }

  @GetMapping
  public List<ContactResponse> list() {
    return contactoService.list().stream().map(this::toResponse).toList();
  }

  @GetMapping("/{id}")
  public ContactResponse getById(@PathVariable String id) {
    return toResponse(contactoService.getById(id));
  }

  @PatchMapping("/{id}")
  public ContactResponse updateStatus(
      @PathVariable String id, @RequestBody java.util.Map<String, String> body, jakarta.servlet.http.HttpServletRequest request) {
    String status = body.get("status");
    return toResponse(auditedMutation.execute("contact.update_status", "contact", id, request.getRemoteAddr(), request.getHeader("User-Agent"), java.util.Map.of("newStatus", status), () -> contactoService.updateStatus(id, status)));
  }

  @DeleteMapping("/{id}")
  public java.util.Map<String, Boolean> delete(@PathVariable String id, jakarta.servlet.http.HttpServletRequest request) {
    auditedMutation.execute("contact.delete", "contact", id, request.getRemoteAddr(), request.getHeader("User-Agent"), java.util.Map.of(), () -> { contactoService.delete(id); return null; });
    return java.util.Map.of("success", true);
  }

  private ContactResponse toResponse(Contacto c) {
    return new ContactResponse(
        c.getId(),
        c.getNombre(),
        c.getEmail(),
        c.getTelefono(),
        c.getAsunto(),
        c.getMensaje(),
        c.getEstadoActual() != null ? c.getEstadoActual().name() : "PENDING",
        c.getFechaContacto());
  }
}
