package com.meinardi.rrhh.domain.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "usuario")
public class Usuario {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private String id;

  @Column(unique = true, nullable = false)
  private String email;

  @Column(nullable = false)
  private String password;

  @Column(nullable = false)
  private String nombreUsuario;

  @ManyToOne(optional = false)
  @JoinColumn(name = "rol_id")
  private Rol rol;

  private String passwordResetToken;

  private Instant passwordResetTokenExpiry;

  protected Usuario() {}

  public Usuario(String id, String email, String password, String nombreUsuario, Rol rol) {
    this.id = id;
    this.email = email;
    this.password = password;
    this.nombreUsuario = nombreUsuario;
    this.rol = rol;
  }

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public String getEmail() { return email; }
  public void setEmail(String email) { this.email = email; }
  public String getPassword() { return password; }
  public void setPassword(String password) { this.password = password; }
  public String getNombreUsuario() { return nombreUsuario; }
  public void setNombreUsuario(String nombreUsuario) { this.nombreUsuario = nombreUsuario; }
  public Rol getRol() { return rol; }
  public void setRol(Rol rol) { this.rol = rol; }
  public String getPasswordResetToken() { return passwordResetToken; }
  public void setPasswordResetToken(String passwordResetToken) { this.passwordResetToken = passwordResetToken; }
  public Instant getPasswordResetTokenExpiry() { return passwordResetTokenExpiry; }
  public void setPasswordResetTokenExpiry(Instant passwordResetTokenExpiry) { this.passwordResetTokenExpiry = passwordResetTokenExpiry; }
}
