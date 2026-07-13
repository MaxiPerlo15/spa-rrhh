package com.meinardi.rrhh.domain.model;

import jakarta.persistence.*;

@Entity
@Table(name = "\"User\"")
public class PrismaUser {
  @Id
  @Column(name = "id")
  private String id;

  @Column(name = "email", unique = true, nullable = false)
  private String email;

  @Column(name = "name")
  private String name;

  @Column(name = "\"passwordHash\"", nullable = false)
  private String passwordHash;

  @Column(name = "role", nullable = false)
  private String role;

  protected PrismaUser() {}

  public static PrismaUser create(String id, String email, String passwordHash, String name, String role) {
    PrismaUser u = new PrismaUser();
    u.id = id;
    u.email = email;
    u.passwordHash = passwordHash;
    u.name = name;
    u.role = role;
    return u;
  }

  public String getId() { return id; }
  public String getEmail() { return email; }
  public String getName() { return name; }
  public String getPasswordHash() { return passwordHash; }
  public String getRole() { return role; }
}
