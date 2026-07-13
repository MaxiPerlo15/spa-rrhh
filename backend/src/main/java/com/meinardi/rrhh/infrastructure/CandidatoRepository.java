package com.meinardi.rrhh.infrastructure;

import com.meinardi.rrhh.domain.model.Candidato;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

public interface CandidatoRepository extends JpaRepository<Candidato, String> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  Optional<Candidato> findByPersonKey(String personKey);
}
