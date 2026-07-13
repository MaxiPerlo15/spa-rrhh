package com.meinardi.rrhh.domain.model;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "estado")
public class Estado {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private String id;

  private String nombre;

  @Enumerated(EnumType.STRING)
  private EstadoAmbito ambito;

  @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
  @JoinColumn(name = "estado_id")
  private List<EstadoHistorial> historial = new ArrayList<>();

  protected Estado() {}

  public Estado(String id, String nombre, EstadoAmbito ambito, List<EstadoHistorial> historial) {
    this.id = id;
    this.nombre = nombre;
    this.ambito = ambito;
    this.historial = historial;
  }

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public String getNombre() { return nombre; }
  public void setNombre(String nombre) { this.nombre = nombre; }
  public EstadoAmbito getAmbito() { return ambito; }
  public void setAmbito(EstadoAmbito ambito) { this.ambito = ambito; }
  public List<EstadoHistorial> getHistorial() { return historial; }
  public void setHistorial(List<EstadoHistorial> historial) { this.historial = historial; }
}
