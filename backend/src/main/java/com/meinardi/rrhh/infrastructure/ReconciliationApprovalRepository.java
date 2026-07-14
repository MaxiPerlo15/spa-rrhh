package com.meinardi.rrhh.infrastructure;

import com.meinardi.rrhh.domain.model.ReconciliationApproval;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReconciliationApprovalRepository extends JpaRepository<ReconciliationApproval, String> {}
