package com.meinardi.rrhh.domain.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "candidato")
public class Candidato {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private String id;

  private String nombre;
  private String apellido;

  @Column(nullable = false)
  private String email;

  private String telefono;
  private String cv;

  @Column(unique = true)
  private String personKey;

  private String resumeUrl;
  private String resumeFileName;
  private String resumeKey;

  private OffsetDateTime createdAt;
  private OffsetDateTime updatedAt;

  protected Candidato() {}

  public static Candidato create(String nombreCompleto, String email, String telefono, String cv) {
    Candidato candidato = new Candidato();
    candidato.nombre = requireText(nombreCompleto, "nombre");
    candidato.email = requireText(email, "email");
    candidato.telefono = requireText(telefono, "telefono");
    candidato.cv = cv != null && !cv.isBlank() ? cv.trim() : null;
    candidato.apellido = null;
    candidato.createdAt = OffsetDateTime.now();
    return candidato;
  }

  public Candidato(
      String id,
      String nombre,
      String apellido,
      String email,
      String telefono,
      String cv,
      String personKey,
      String resumeUrl,
      String resumeFileName,
      String resumeKey,
      OffsetDateTime createdAt,
      OffsetDateTime updatedAt) {
    this.id = id;
    this.nombre = nombre;
    this.apellido = apellido;
    this.email = email;
    this.telefono = telefono;
    this.cv = cv;
    this.personKey = personKey;
    this.resumeUrl = resumeUrl;
    this.resumeFileName = resumeFileName;
    this.resumeKey = resumeKey;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  private static String requireText(String value, String fieldName) {
    if (value == null || value.isBlank()) {
      throw new IllegalArgumentException(fieldName + " is required");
    }
    return value.trim();
  }

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public String getNombre() { return nombre; }
  public void setNombre(String nombre) { this.nombre = nombre; }
  public String getApellido() { return apellido; }
  public void setApellido(String apellido) { this.apellido = apellido; }
  public String getEmail() { return email; }
  public void setEmail(String email) { this.email = email; }
  public String getTelefono() { return telefono; }
  public void setTelefono(String telefono) { this.telefono = telefono; }
  public String getCv() { return cv; }
  public void setCv(String cv) { this.cv = cv; }
  public String getPersonKey() { return personKey; }
  public void setPersonKey(String personKey) { this.personKey = personKey; }
  public String getResumeUrl() { return resumeUrl; }
  public void setResumeUrl(String resumeUrl) { this.resumeUrl = resumeUrl; }
  public String getResumeFileName() { return resumeFileName; }
  public void setResumeFileName(String resumeFileName) { this.resumeFileName = resumeFileName; }
  public String getResumeKey() { return resumeKey; }
  public void setResumeKey(String resumeKey) { this.resumeKey = resumeKey; }
  public OffsetDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
  public OffsetDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
