package com.meinardi.rrhh.application;

import com.meinardi.rrhh.presentation.ApplicationDetailResponse;

public interface ApplicationAdminInputBoundary {
  ApplicationDetailResponse getById(String id);

  ApplicationDetailResponse updateStatus(String id, String status);

  void delete(String id);
}
