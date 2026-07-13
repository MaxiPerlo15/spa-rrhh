package com.meinardi.rrhh.application;

import com.meinardi.rrhh.domain.model.Jornada;
import com.meinardi.rrhh.domain.model.Modalidad;

public record UpdateVacancyCommand(
    String titulo,
    String descripcion,
    String requisitos,
    String ubicacionNombre,
    String ubicacionDescripcion,
    Jornada jornada,
    Modalidad modalidad) {}
