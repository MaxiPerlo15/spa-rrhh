package com.meinardi.rrhh.infrastructure;

import com.meinardi.rrhh.domain.model.ReconciliationItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReconciliationItemRepository extends JpaRepository<ReconciliationItem, String> {}
