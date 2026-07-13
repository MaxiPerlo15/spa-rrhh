package com.meinardi.rrhh.application;

import com.meinardi.rrhh.domain.model.Vacante;

public interface ActivateVacancyInputBoundary {
  Vacante activateVacancy(String vacancyId);
}
