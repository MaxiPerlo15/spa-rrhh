package com.meinardi.rrhh.application;

import com.meinardi.rrhh.domain.model.Vacante;

public interface GetVacancyInputBoundary {
  Vacante getVacancy(String vacancyId);
}
