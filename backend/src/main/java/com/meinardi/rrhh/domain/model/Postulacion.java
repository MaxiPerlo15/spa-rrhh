package com.meinardi.rrhh.domain.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "postulacion")
public class Postulacion {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private String id;

  private OffsetDateTime fechaPostulacion;

  private OffsetDateTime submittedAt;

  private OffsetDateTime updatedAt;

  @Column(columnDefinition = "TEXT")
  private String observacion;

  @Enumerated(EnumType.STRING)
  private ApplicationStatus estadoActual;

  @ManyToOne
  @JoinColumn(name = "vacante_id")
  private Vacante vacante;

  @ManyToOne(optional = false)
  @JoinColumn(name = "candidato_id")
  private Candidato candidato;

  protected Postulacion() {}

  public static Postulacion createForVacancy(
      Vacante vacante, Candidato candidato, String observacion) {
    if (vacante == null) {
      throw new IllegalArgumentException("vacante is required");
    }
    if (!vacante.canReceiveApplications()) {
      throw new IllegalStateException("Solo las vacantes activas pueden recibir postulaciones");
    }
    if (candidato == null) {
      throw new IllegalArgumentException("candidato is required");
    }

    Postulacion postulacion = new Postulacion();
    postulacion.vacante = vacante;
    postulacion.candidato = candidato;
    postulacion.observacion = normalizeOptionalText(observacion);
    postulacion.fechaPostulacion = OffsetDateTime.now();
    postulacion.estadoActual = ApplicationStatus.PENDING;
    return postulacion;
  }

  public static Postulacion createSpontaneous(Candidato candidato, String observacion) {
    if (candidato == null) {
      throw new IllegalArgumentException("candidato is required");
    }

    Postulacion postulacion = new Postulacion();
    postulacion.vacante = null;
    postulacion.candidato = candidato;
    postulacion.observacion = normalizeOptionalText(observacion);
    postulacion.fechaPostulacion = OffsetDateTime.now();
    postulacion.estadoActual = ApplicationStatus.PENDING;
    return postulacion;
  }

  public Postulacion(
      String id,
      OffsetDateTime fechaPostulacion,
      String observacion,
      ApplicationStatus estadoActual,
      Vacante vacante,
      Candidato candidato) {
    this.id = id;
    this.fechaPostulacion = fechaPostulacion;
    this.observacion = observacion;
    this.estadoActual = estadoActual;
    this.vacante = vacante;
    this.candidato = candidato;
  }

  public void ponerEnRevision() {
    ApplicationStatusMachine.assertTransition(this.estadoActual, ApplicationStatus.REVIEWING);
    this.estadoActual = ApplicationStatus.REVIEWING;
  }

  public void marcarComoEntrevistado() {
    ApplicationStatusMachine.assertTransition(this.estadoActual, ApplicationStatus.INTERVIEWED);
    this.estadoActual = ApplicationStatus.INTERVIEWED;
  }

  public void aceptar() {
    ApplicationStatusMachine.assertTransition(this.estadoActual, ApplicationStatus.ACCEPTED);
    this.estadoActual = ApplicationStatus.ACCEPTED;
  }

  public void rechazar() {
    ApplicationStatusMachine.assertTransition(this.estadoActual, ApplicationStatus.REJECTED);
    this.estadoActual = ApplicationStatus.REJECTED;
  }

  public boolean esEspontanea() {
    return this.vacante == null;
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
  public OffsetDateTime getFechaPostulacion() { return fechaPostulacion; }
  public void setFechaPostulacion(OffsetDateTime fechaPostulacion) { this.fechaPostulacion = fechaPostulacion; }
  public OffsetDateTime getSubmittedAt() { return submittedAt; }
  public void setSubmittedAt(OffsetDateTime submittedAt) { this.submittedAt = submittedAt; }
  public OffsetDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
  public String getObservacion() { return observacion; }
  public void setObservacion(String observacion) { this.observacion = observacion; }
  public ApplicationStatus getEstadoActual() { return estadoActual; }
  public void setEstadoActual(ApplicationStatus estadoActual) { this.estadoActual = estadoActual; }
  public Vacante getVacante() { return vacante; }
  public void setVacante(Vacante vacante) { this.vacante = vacante; }
  public Candidato getCandidato() { return candidato; }
  public void setCandidato(Candidato candidato) { this.candidato = candidato; }
}
