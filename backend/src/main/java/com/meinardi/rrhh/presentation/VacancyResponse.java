package com.meinardi.rrhh.presentation;

import com.meinardi.rrhh.domain.model.Jornada;
import com.meinardi.rrhh.domain.model.Modalidad;
import com.meinardi.rrhh.domain.model.VacancyStatus;
import com.meinardi.rrhh.domain.model.Vacante;
import java.time.OffsetDateTime;

public record VacancyResponse(
    String id,
    String titulo,
    String descripcion,
    String requisitos,
    String ubicacionNombre,
    String ubicacionDescripcion,
    Jornada jornada,
    Modalidad modalidad,
    VacancyStatus estadoActual,
    OffsetDateTime fechaCreacion,
    OffsetDateTime fechaPublicacion) {
  public static VacancyResponse from(Vacante vacancy) {
    return new VacancyResponse(
        vacancy.getId(),
        vacancy.getTitulo(),
        vacancy.getDescripcion(),
        vacancy.getRequisitos(),
        vacancy.getUbicacion() != null ? vacancy.getUbicacion().getNombre() : null,
        vacancy.getUbicacion() != null ? vacancy.getUbicacion().getDescripcion() : null,
        vacancy.getJornada(),
        vacancy.getModalidad(),
        vacancy.getEstadoActual(),
        vacancy.getFechaCreacion(),
        vacancy.getFechaPublicacion());
  }
}
