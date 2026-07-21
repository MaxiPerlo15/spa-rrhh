package com.meinardi.rrhh.application;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

@ExtendWith(MockitoExtension.class)
class HealthServiceTest {

  @Mock private JdbcTemplate jdbcTemplate;

  @InjectMocks private HealthService healthService;

  @Test
  void checksTheDatabaseWithASelectOneQuery() {
    when(jdbcTemplate.queryForObject("SELECT 1", Integer.class)).thenReturn(1);

    healthService.checkDatabaseReadiness();

    verify(jdbcTemplate).queryForObject("SELECT 1", Integer.class);
  }

  @Test
  void propagatesDatabaseFailuresToTheController() {
    when(jdbcTemplate.queryForObject("SELECT 1", Integer.class))
        .thenThrow(new IllegalStateException("database unavailable"));

    assertThatThrownBy(() -> healthService.checkDatabaseReadiness())
        .isInstanceOf(IllegalStateException.class)
        .hasMessage("database unavailable");
  }
}
