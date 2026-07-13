package com.meinardi.rrhh.infrastructure;

import com.meinardi.rrhh.domain.model.Postulacion;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PostulacionRepository extends JpaRepository<Postulacion, String> {

  @Query(
      "SELECT p FROM Postulacion p JOIN FETCH p.candidato LEFT JOIN FETCH p.vacante WHERE p.id = :id")
  Optional<Postulacion> findByIdWithCandidatoAndVacante(@Param("id") String id);

  @Query(
      "SELECT p FROM Postulacion p WHERE p.candidato.id = :candidatoId "
          + "AND p.vacante.id = :vacanteId "
          + "AND p.fechaPostulacion >= :since")
  List<Postulacion> findRecentByCandidatoAndVacante(
      @Param("candidatoId") String candidatoId,
      @Param("vacanteId") String vacancyId,
      @Param("since") OffsetDateTime since);

  @Query(
      "SELECT p FROM Postulacion p WHERE p.candidato.id = :candidatoId "
          + "AND p.vacante IS NULL "
          + "AND p.fechaPostulacion >= :since")
  List<Postulacion> findRecentSpontaneousByCandidato(
      @Param("candidatoId") String candidatoId,
      @Param("since") OffsetDateTime since);
}
