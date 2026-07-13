package com.meinardi.rrhh.infrastructure;

import com.meinardi.rrhh.domain.model.Contacto;
import jakarta.persistence.LockModeType;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ContactoRepository extends JpaRepository<Contacto, String> {

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT c FROM Contacto c WHERE c.personKey = :personKey AND c.asunto = :subject")
  Optional<Contacto> findByPersonKeyAndSubject(
      @Param("personKey") String personKey, @Param("subject") String subject);

  @Query(
      "SELECT c FROM Contacto c WHERE c.personKey = :personKey AND c.asunto = :subject AND c.fechaContacto >= :since")
  List<Contacto> findByPersonKeyAndSubjectAndCreatedAtAfter(
      @Param("personKey") String personKey,
      @Param("subject") String subject,
      @Param("since") OffsetDateTime since);
}
