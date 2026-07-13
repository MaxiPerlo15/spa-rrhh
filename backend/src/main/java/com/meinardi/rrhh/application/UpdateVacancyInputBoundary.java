package com.meinardi.rrhh.application;

import com.meinardi.rrhh.domain.model.Vacante;

public interface UpdateVacancyInputBoundary {
  Vacante updateVacancy(String vacancyId, UpdateVacancyCommand command);
}
