package com.meinardi.rrhh.application;

import com.meinardi.rrhh.domain.model.Vacante;

public interface DeactivateVacancyInputBoundary {
  Vacante deactivateVacancy(String vacancyId);
}
