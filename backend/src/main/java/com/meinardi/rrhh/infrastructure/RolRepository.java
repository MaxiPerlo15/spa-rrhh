package com.meinardi.rrhh.infrastructure;

import com.meinardi.rrhh.domain.model.Rol;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RolRepository extends JpaRepository<Rol, String> {
  Optional<Rol> findByNombre(String nombre);
}
