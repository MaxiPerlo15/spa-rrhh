package com.meinardi.rrhh.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.meinardi.rrhh.presentation.ApplicationDetailResponse;
import com.meinardi.rrhh.presentation.ApplicationStatusUpdateRequest;
import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;

class ApplicationAdminInputBoundaryTest {

  @Test
  void getByIdReturnsApplicationDetailResponseType() throws NoSuchMethodException {
    Method method = ApplicationAdminInputBoundary.class.getMethod("getById", String.class);

    assertThat(method.getReturnType()).isEqualTo(ApplicationDetailResponse.class);
  }

  @Test
  void updateStatusReturnsApplicationDetailResponseType() throws NoSuchMethodException {
    Method method =
        ApplicationAdminInputBoundary.class.getMethod("updateStatus", String.class, String.class);

    assertThat(method.getReturnType()).isEqualTo(ApplicationDetailResponse.class);
  }

  @Test
  void deleteReturnsVoidType() throws NoSuchMethodException {
    Method method = ApplicationAdminInputBoundary.class.getMethod("delete", String.class);

    assertThat(method.getReturnType()).isEqualTo(void.class);
  }

  @Test
  void interfaceHasExactlyThreeMethods() {
    Method[] methods = ApplicationAdminInputBoundary.class.getDeclaredMethods();

    assertThat(methods).hasSize(3);
  }
}
