package com.meinardi.rrhh.application;

import com.meinardi.rrhh.domain.model.Postulacion;

public interface ApplicationIntakeInputBoundary {
  Postulacion submitApplication(SubmitApplicationCommand command);
}
