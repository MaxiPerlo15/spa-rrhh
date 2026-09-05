package com.meinardi.rrhh.application;

import com.meinardi.rrhh.domain.model.Postulacion;
import java.util.List;

public interface ApplicationListInputBoundary {
  List<Postulacion> listApplications(String vacancyId, String status);

  default List<Postulacion> listApplications(String vacancyId, String status, String search) {
    return listApplications(vacancyId, status);
  }

  default List<Postulacion> listApplications(
      String vacancyId, String status, String search, String sortBy, String sortDirection) {
    return listApplications(vacancyId, status, search);
  }
}
