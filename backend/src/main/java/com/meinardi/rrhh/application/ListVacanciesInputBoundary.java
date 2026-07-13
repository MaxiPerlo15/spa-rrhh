package com.meinardi.rrhh.application;

import com.meinardi.rrhh.domain.model.Vacante;
import java.util.List;

public interface ListVacanciesInputBoundary {
  List<Vacante> listVacancies(boolean includeAll);
}
