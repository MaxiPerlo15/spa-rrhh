package com.meinardi.rrhh.application;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class HealthService {
  private final JdbcTemplate jdbcTemplate;

  public HealthService(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public void checkDatabaseReadiness() {
    jdbcTemplate.queryForObject("SELECT 1", Integer.class);
  }
}
