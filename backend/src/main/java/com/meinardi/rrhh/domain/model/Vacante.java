package com.meinardi.rrhh.domain.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Entity
@Table(name = "vacante")
public class Vacante {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private String id;

  private String titulo;

  @Column(columnDefinition = "TEXT")
  private String descripcion;

  @Column(columnDefinition = "TEXT")
  private String requisitos;

  @Embedded
  @AttributeOverrides({
    @AttributeOverride(name = "nombre", column = @Column(name = "ubicacion_nombre")),
    @AttributeOverride(name = "descripcion", column = @Column(name = "ubicacion_descripcion"))
  })
  private Ubicacion ubicacion;

  @Enumerated(EnumType.STRING)
  private Jornada jornada;

  @Enumerated(EnumType.STRING)
  private Modalidad modalidad;

  private OffsetDateTime fechaCreacion;
  private OffsetDateTime fechaPublicacion;

  @Enumerated(EnumType.STRING)
  private VacancyStatus estadoActual;

  @OneToMany(mappedBy = "vacante", cascade = CascadeType.ALL)
  private List<Postulacion> postulaciones = new ArrayList<>();

  protected Vacante() {}

  public Vacante(
      String id,
      String titulo,
      String descripcion,
      String requisitos,
      Ubicacion ubicacion,
      Jornada jornada,
      Modalidad modalidad,
      OffsetDateTime fechaCreacion,
      OffsetDateTime fechaPublicacion,
      VacancyStatus estadoActual,
      List<Postulacion> postulaciones) {
    this.id = id;
    this.titulo = titulo;
    this.descripcion = descripcion;
    this.requisitos = requisitos;
    this.ubicacion = ubicacion;
    this.jornada = jornada;
    this.modalidad = modalidad;
    this.fechaCreacion = fechaCreacion;
    this.fechaPublicacion = fechaPublicacion;
    this.estadoActual = estadoActual;
    this.postulaciones = postulaciones != null ? postulaciones : new ArrayList<>();
  }

  public static Vacante create(
      String titulo,
      String descripcion,
      String requisitos,
      Ubicacion ubicacion,
      Jornada jornada,
      Modalidad modalidad) {
    Vacante vacante = new Vacante();
    vacante.titulo = requireText(titulo, "titulo");
    vacante.descripcion = requireText(descripcion, "descripcion");
    vacante.requisitos = requisitos;
    vacante.ubicacion = Objects.requireNonNull(ubicacion, "ubicacion is required");
    vacante.jornada = Objects.requireNonNull(jornada, "jornada is required");
    vacante.modalidad = Objects.requireNonNull(modalidad, "modalidad is required");
    vacante.fechaCreacion = OffsetDateTime.now();
    vacante.estadoActual = VacancyStatus.CREATED;
    return vacante;
  }

  private static String requireText(String value, String fieldName) {
    if (value == null || value.isBlank()) {
      throw new IllegalArgumentException(fieldName + " is required");
    }
    return value.trim();
  }

  public void activar() {
    if (this.estadoActual == VacancyStatus.CLOSED) {
      throw new IllegalStateException("La vacante cerrada no puede activarse");
    }
    if (this.estadoActual == VacancyStatus.ACTIVE) {
      throw new IllegalStateException("La vacante ya se encuentra activa");
    }
    this.estadoActual = VacancyStatus.ACTIVE;
    this.fechaPublicacion = OffsetDateTime.now();
  }

  public void desactivar() {
    if (this.estadoActual == VacancyStatus.CLOSED) {
      throw new IllegalStateException("La vacante cerrada no puede desactivarse");
    }
    if (this.estadoActual != VacancyStatus.ACTIVE) {
      throw new IllegalStateException("Solo una vacante activa puede desactivarse");
    }
    this.estadoActual = VacancyStatus.INACTIVE;
  }

  public void cerrar() {
    if (this.estadoActual == VacancyStatus.CLOSED) {
      throw new IllegalStateException("La vacante ya se encuentra cerrada");
    }
    this.estadoActual = VacancyStatus.CLOSED;
  }

  public void updateDetails(
      String titulo,
      String descripcion,
      String requisitos,
      Ubicacion ubicacion,
      Jornada jornada,
      Modalidad modalidad) {
    this.titulo = requireText(titulo, "titulo");
    this.descripcion = requireText(descripcion, "descripcion");
    this.requisitos = normalizeOptionalText(requisitos);
    this.ubicacion = Objects.requireNonNull(ubicacion, "ubicacion is required");
    this.jornada = Objects.requireNonNull(jornada, "jornada is required");
    this.modalidad = Objects.requireNonNull(modalidad, "modalidad is required");
  }

  public boolean canReceiveApplications() {
    return this.estadoActual == VacancyStatus.ACTIVE;
  }

  private static String normalizeOptionalText(String value) {
    if (value == null) {
      return null;
    }

    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public String getTitulo() { return titulo; }
  public void setTitulo(String titulo) { this.titulo = titulo; }
  public String getDescripcion() { return descripcion; }
  public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
  public String getRequisitos() { return requisitos; }
  public void setRequisitos(String requisitos) { this.requisitos = requisitos; }
  public Ubicacion getUbicacion() { return ubicacion; }
  public void setUbicacion(Ubicacion ubicacion) { this.ubicacion = ubicacion; }
  public Jornada getJornada() { return jornada; }
  public void setJornada(Jornada jornada) { this.jornada = jornada; }
  public Modalidad getModalidad() { return modalidad; }
  public void setModalidad(Modalidad modalidad) { this.modalidad = modalidad; }
  public OffsetDateTime getFechaCreacion() { return fechaCreacion; }
  public void setFechaCreacion(OffsetDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
  public OffsetDateTime getFechaPublicacion() { return fechaPublicacion; }
  public void setFechaPublicacion(OffsetDateTime fechaPublicacion) { this.fechaPublicacion = fechaPublicacion; }
  public VacancyStatus getEstadoActual() { return estadoActual; }
  public void setEstadoActual(VacancyStatus estadoActual) { this.estadoActual = estadoActual; }
  public List<Postulacion> getPostulaciones() { return postulaciones; }
  public void setPostulaciones(List<Postulacion> postulaciones) { this.postulaciones = postulaciones; }
}
