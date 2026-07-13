package com.meinardi.rrhh.presentation;

import java.util.List;

public record LoginResponse(
    String userId,
    String email,
    String nombreUsuario,
    RolDto rol) {
  public record RolDto(String id, String nombre, List<String> permisos) {}
}
