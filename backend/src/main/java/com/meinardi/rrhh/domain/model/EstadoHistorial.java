package com.meinardi.rrhh.domain.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "estado_historial")
public class EstadoHistorial {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private String id;

  private OffsetDateTime fechaHoraCambio;
  private String observacion;

  protected EstadoHistorial() {}

  public EstadoHistorial(String id, OffsetDateTime fechaHoraCambio, String observacion) {
    this.id = id;
    this.fechaHoraCambio = fechaHoraCambio;
    this.observacion = observacion;
  }

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public OffsetDateTime getFechaHoraCambio() { return fechaHoraCambio; }
  public void setFechaHoraCambio(OffsetDateTime fechaHoraCambio) { this.fechaHoraCambio = fechaHoraCambio; }
  public String getObservacion() { return observacion; }
  public void setObservacion(String observacion) { this.observacion = observacion; }
}
