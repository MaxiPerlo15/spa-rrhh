package com.meinardi.rrhh.domain.model;

import jakarta.persistence.*;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "rol")
public class Rol {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private String id;

  private String nombre;
  private String descripcion;

  @ManyToMany
  @JoinTable(
      name = "rol_permiso",
      joinColumns = @JoinColumn(name = "rol_id"),
      inverseJoinColumns = @JoinColumn(name = "permiso_id"))
  private Set<Permiso> permisos = new HashSet<>();

  protected Rol() {}

  public Rol(String id, String nombre, String descripcion, Set<Permiso> permisos) {
    this.id = id;
    this.nombre = nombre;
    this.descripcion = descripcion;
    this.permisos = permisos;
  }

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public String getNombre() { return nombre; }
  public void setNombre(String nombre) { this.nombre = nombre; }
  public String getDescripcion() { return descripcion; }
  public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
  public Set<Permiso> getPermisos() { return permisos; }
  public void setPermisos(Set<Permiso> permisos) { this.permisos = permisos; }
}
