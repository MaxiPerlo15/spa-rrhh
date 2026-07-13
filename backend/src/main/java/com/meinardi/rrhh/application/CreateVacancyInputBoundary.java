package com.meinardi.rrhh.application;

import com.meinardi.rrhh.domain.model.Vacante;

public interface CreateVacancyInputBoundary {
  Vacante registerVacancy(CreateVacancyCommand command);
}
