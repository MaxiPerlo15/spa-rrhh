package com.meinardi.rrhh.application;

import com.meinardi.rrhh.domain.model.AdminNotification;
import com.meinardi.rrhh.domain.model.NotificationLevel;
import com.meinardi.rrhh.infrastructure.AdminNotificationRepository;
import java.util.UUID;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {
  private final AdminNotificationRepository repository;
  public NotificationService(AdminNotificationRepository repository) { this.repository = repository; }
  public Page<AdminNotification> list(String view, Pageable pageable) { Pageable ordered = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by(Sort.Direction.DESC, "createdAt")); return "all".equals(view) ? repository.findAll(ordered) : repository.findAllByIsRead("read".equals(view), ordered); }
  @Transactional public AdminNotification create(String title, String message, NotificationLevel level, String actionLabel, String actionType, String actionResourceId) { return repository.save(AdminNotification.create(UUID.randomUUID().toString(), title, message, level, actionLabel, actionType, actionResourceId)); }
  @Transactional public AdminNotification updateReadState(String id, boolean isRead) { AdminNotification notification = repository.findById(id).orElseThrow(NotificationNotFoundException::new); notification.setRead(isRead); repository.save(notification); return notification; }
  @Transactional public long delete(String view) { return "all".equals(view) ? deleteAll() : repository.deleteByIsRead(true); }
  @Transactional public void deleteOne(String id) { repository.delete(repository.findById(id).orElseThrow(NotificationNotFoundException::new)); }
  private long deleteAll() { long count = repository.count(); repository.deleteAll(); return count; }
}
