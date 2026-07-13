package com.meinardi.rrhh.domain.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "contacto")
public class Contacto {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private String id;

  private String nombre;
  private String email;
  private String telefono;

  private String asunto;

  @Column(columnDefinition = "TEXT")
  private String mensaje;

  @Column(unique = true)
  private String personKey;

  private OffsetDateTime fechaContacto;

  private OffsetDateTime updatedAt;

  @Enumerated(EnumType.STRING)
  private ContactStatus estadoActual;

  protected Contacto() {}

  public Contacto(
      String id,
      String nombre,
      String email,
      String telefono,
      String asunto,
      String mensaje,
      String personKey,
      OffsetDateTime fechaContacto,
      ContactStatus estadoActual) {
    this.id = id;
    this.nombre = nombre;
    this.email = email;
    this.telefono = telefono;
    this.asunto = asunto;
    this.mensaje = mensaje;
    this.personKey = personKey;
    this.fechaContacto = fechaContacto;
    this.estadoActual = estadoActual;
  }

  public static Contacto create(
      String nombre,
      String email,
      String telefono,
      String asunto,
      String mensaje,
      String personKey) {
    Contacto c = new Contacto();
    c.nombre = nombre;
    c.email = email;
    c.telefono = telefono;
    c.asunto = asunto;
    c.mensaje = mensaje;
    c.personKey = personKey;
    c.fechaContacto = OffsetDateTime.now();
    c.estadoActual = ContactStatus.PENDING;
    return c;
  }

  @PreUpdate
  protected void onUpdate() {
    this.updatedAt = OffsetDateTime.now();
  }

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public String getNombre() { return nombre; }
  public void setNombre(String nombre) { this.nombre = nombre; }
  public String getEmail() { return email; }
  public void setEmail(String email) { this.email = email; }
  public String getTelefono() { return telefono; }
  public void setTelefono(String telefono) { this.telefono = telefono; }
  public String getAsunto() { return asunto; }
  public void setAsunto(String asunto) { this.asunto = asunto; }
  public String getMensaje() { return mensaje; }
  public void setMensaje(String mensaje) { this.mensaje = mensaje; }
  public String getPersonKey() { return personKey; }
  public void setPersonKey(String personKey) { this.personKey = personKey; }
  public OffsetDateTime getFechaContacto() { return fechaContacto; }
  public void setFechaContacto(OffsetDateTime fechaContacto) { this.fechaContacto = fechaContacto; }
  public OffsetDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
  public ContactStatus getEstadoActual() { return estadoActual; }
  public void setEstadoActual(ContactStatus estadoActual) { this.estadoActual = estadoActual; }
}

