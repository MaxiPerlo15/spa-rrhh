package com.meinardi.rrhh.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import com.meinardi.rrhh.domain.model.AdminNotification;
import com.meinardi.rrhh.domain.model.NotificationLevel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

@SpringBootTest(
    properties = {
      "spring.flyway.enabled=true",
      "spring.jpa.hibernate.ddl-auto=validate",
      "spring.datasource.driver-class-name=org.postgresql.Driver",
      "rrhh.security.internal-api-token=test-token"
    })
class AdminNotificationRepositoryIntegrationTest {

  private static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine");

  static {
    POSTGRES.start();
  }

  @DynamicPropertySource
  static void databaseProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
  }

  @Autowired private AdminNotificationRepository repository;

  @BeforeEach
  void clearNotifications() {
    repository.deleteAll();
  }

  @Test
  void persistsListsUpdatesAndDeletesNotificationsInPostgres() {
    AdminNotification notification =
        AdminNotification.create(
            "notification-1",
            "New application",
            "Ana applied",
            NotificationLevel.SUCCESS,
            "View application",
            "APPLICATION",
            "application-1");

    repository.save(notification);

    assertThat(repository.findById("notification-1"))
        .get()
        .satisfies(
            persisted -> {
              assertThat(persisted.getTitle()).isEqualTo("New application");
              assertThat(persisted.getActionType().name()).isEqualTo("APPLICATION");
              assertThat(persisted.isRead()).isFalse();
            });
    assertThat(repository.findAll(PageRequest.of(0, 10)).getContent()).hasSize(1);

    notification.setRead(true);
    repository.save(notification);

    assertThat(repository.findAllByIsRead(true, PageRequest.of(0, 10)).getTotalElements())
        .isEqualTo(1);
    assertThat(repository.deleteByIsRead(true)).isEqualTo(1);
    assertThat(repository.count()).isZero();
  }
}
