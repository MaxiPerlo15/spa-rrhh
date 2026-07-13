package com.meinardi.rrhh.application;

import com.meinardi.rrhh.domain.model.Jornada;
import com.meinardi.rrhh.domain.model.Modalidad;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateVacancyCommand(
    @NotBlank String titulo,
    @NotBlank String descripcion,
    String requisitos,
    @NotBlank String ubicacionNombre,
    String ubicacionDescripcion,
    @NotNull Jornada jornada,
    @NotNull Modalidad modalidad) {}
