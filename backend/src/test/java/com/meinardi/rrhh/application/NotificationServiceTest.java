package com.meinardi.rrhh.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.meinardi.rrhh.domain.model.AdminNotification;
import com.meinardi.rrhh.domain.model.NotificationLevel;
import com.meinardi.rrhh.infrastructure.AdminNotificationRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {
  @Mock private AdminNotificationRepository repository;
  @InjectMocks private NotificationService notificationService;

  @Test
  void updatesAReadNotificationAndRejectsMissingIds() {
    AdminNotification notification = AdminNotification.create("n1", "Nuevo CV", "Ana aplicó", NotificationLevel.SUCCESS, null, null, null);
    when(repository.findById("n1")).thenReturn(Optional.of(notification));

    assertThat(notificationService.updateReadState("n1", true).isRead()).isTrue();
    assertThatThrownBy(() -> notificationService.updateReadState("missing", true))
        .isInstanceOf(NotificationNotFoundException.class);
  }
}
