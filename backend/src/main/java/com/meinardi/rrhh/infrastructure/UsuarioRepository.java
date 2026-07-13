package com.meinardi.rrhh.infrastructure;

import com.meinardi.rrhh.domain.model.Usuario;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UsuarioRepository extends JpaRepository<Usuario, String> {
  Optional<Usuario> findByEmail(String email);

  Optional<Usuario> findByPasswordResetToken(String token);
}
