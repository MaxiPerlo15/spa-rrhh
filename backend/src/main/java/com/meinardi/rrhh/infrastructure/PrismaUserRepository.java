package com.meinardi.rrhh.infrastructure;

import com.meinardi.rrhh.domain.model.PrismaUser;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PrismaUserRepository extends JpaRepository<PrismaUser, String> {
  List<PrismaUser> findByRole(String role);
}
