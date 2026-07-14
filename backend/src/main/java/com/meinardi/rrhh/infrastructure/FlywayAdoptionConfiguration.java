package com.meinardi.rrhh.infrastructure;

import javax.sql.DataSource;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
class FlywayAdoptionConfiguration {

  @Bean
  FlywayMigrationStrategy flywayMigrationStrategy(DataSource dataSource) {
    return flyway -> new FlywayCatalogAdopter(dataSource).adopt(flyway);
  }
}
