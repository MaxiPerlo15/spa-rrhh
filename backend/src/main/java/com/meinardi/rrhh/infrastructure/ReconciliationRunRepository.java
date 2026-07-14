package com.meinardi.rrhh.infrastructure;

import com.meinardi.rrhh.domain.model.ReconciliationRun;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReconciliationRunRepository extends JpaRepository<ReconciliationRun, String> {}
