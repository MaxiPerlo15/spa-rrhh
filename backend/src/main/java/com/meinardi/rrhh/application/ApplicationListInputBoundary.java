package com.meinardi.rrhh.application;

import com.meinardi.rrhh.domain.model.Postulacion;
import java.util.List;

public interface ApplicationListInputBoundary {
  List<Postulacion> listApplications(String vacancyId, String status);
}
