package com.meinardi.rrhh.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import com.meinardi.rrhh.domain.model.Permiso;
import com.meinardi.rrhh.domain.model.Rol;
import com.meinardi.rrhh.domain.model.Usuario;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
class UsuarioRepositoryTest {

  @Autowired private UsuarioRepository usuarioRepository;
  @Autowired private TestEntityManager entityManager;

  @Test
  void findByEmailReturnsExistingUser() {
    Permiso permiso = new Permiso(null, "vacancies:read", "Read vacancies");
    entityManager.persist(permiso);

    Rol rol = new Rol(null, "ADMIN", "Administrator", Set.of(permiso));
    entityManager.persist(rol);

    Usuario usuario = new Usuario(null, "admin@test.com", "hashed-password", "admin_user", rol);
    entityManager.persist(usuario);
    entityManager.flush();

    var found = usuarioRepository.findByEmail("admin@test.com");

    assertThat(found).isPresent();
    assertThat(found.get().getEmail()).isEqualTo("admin@test.com");
    assertThat(found.get().getNombreUsuario()).isEqualTo("admin_user");
    assertThat(found.get().getRol().getNombre()).isEqualTo("ADMIN");
  }

  @Test
  void findByEmailReturnsEmptyForUnknownEmail() {
    var found = usuarioRepository.findByEmail("unknown@test.com");

    assertThat(found).isEmpty();
  }

  @Test
  void findByEmailIsCaseSensitive() {
    Permiso permiso = new Permiso(null, "vacancies:read", "Read vacancies");
    entityManager.persist(permiso);

    Rol rol = new Rol(null, "ADMIN", "Administrator", Set.of(permiso));
    entityManager.persist(rol);

    Usuario usuario = new Usuario(null, "Admin@Test.com", "hashed-password", "admin_user", rol);
    entityManager.persist(usuario);
    entityManager.flush();

    var found = usuarioRepository.findByEmail("admin@test.com");

    assertThat(found).isEmpty();
  }
}
