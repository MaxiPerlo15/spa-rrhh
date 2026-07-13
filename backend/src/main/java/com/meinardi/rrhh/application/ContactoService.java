package com.meinardi.rrhh.application;

import com.meinardi.rrhh.domain.model.ContactStatus;
import com.meinardi.rrhh.domain.model.Contacto;
import com.meinardi.rrhh.infrastructure.ContactoRepository;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ContactoService {

  private static final int DUPLICATE_WINDOW_HOURS = 24;

  private final ContactoRepository contactoRepository;

  public ContactoService(ContactoRepository contactoRepository) {
    this.contactoRepository = contactoRepository;
  }

  @Transactional
  public Contacto submit(String nombre, String email, String telefono, String asunto, String mensaje) {
    String personKey = ApplicationManager.buildPersonKey(email, telefono);

    OffsetDateTime since = OffsetDateTime.now().minusHours(DUPLICATE_WINDOW_HOURS);
    List<Contacto> recent =
        contactoRepository.findByPersonKeyAndSubjectAndCreatedAtAfter(personKey, asunto, since);
    if (!recent.isEmpty()) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "DUPLICATE_SUBMISSION");
    }

    Contacto contacto = Contacto.create(nombre, email, telefono, asunto, mensaje, personKey);
    return contactoRepository.save(contacto);
  }

  @Transactional(readOnly = true)
  public List<Contacto> list() {
    return contactoRepository.findAll();
  }

  @Transactional(readOnly = true)
  public Contacto getById(String id) {
    return contactoRepository
        .findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Contact not found"));
  }

  @Transactional
  public Contacto updateStatus(String id, String newStatus) {
    Contacto contacto = getById(id);

    ContactStatus targetStatus = ContactStatus.valueOf(newStatus);
    ContactStatus currentStatus = contacto.getEstadoActual();

    validateTransition(currentStatus, targetStatus);

    contacto.setEstadoActual(targetStatus);
    return contactoRepository.save(contacto);
  }

  @Transactional
  public void delete(String id) {
    Contacto contacto = getById(id);
    contactoRepository.delete(contacto);
  }

  private void validateTransition(ContactStatus from, ContactStatus to) {
    if (from == to) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "INVALID_CONTACT_TRANSITION");
    }

    boolean valid =
        switch (from) {
          case PENDING -> to == ContactStatus.RESPONDED || to == ContactStatus.ARCHIVED;
          case RESPONDED -> to == ContactStatus.ARCHIVED;
          case ARCHIVED -> false;
        };

    if (!valid) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "INVALID_CONTACT_TRANSITION");
    }
  }
}
