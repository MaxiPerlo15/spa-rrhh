package com.meinardi.rrhh.infrastructure;

import com.meinardi.rrhh.domain.model.Usuario;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UsuarioRepository extends JpaRepository<Usuario, String> {
  Optional<Usuario> findByEmail(String email);

  @EntityGraph(attributePaths = {"rol", "rol.permisos"})
  Optional<Usuario> findById(String id);

  Optional<Usuario> findByPasswordResetToken(String token);
}
