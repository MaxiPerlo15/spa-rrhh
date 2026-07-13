package com.meinardi.rrhh.infrastructure;

import com.meinardi.rrhh.domain.model.Permiso;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PermisoRepository extends JpaRepository<Permiso, String> {
  Optional<Permiso> findByNombre(String nombre);
}
