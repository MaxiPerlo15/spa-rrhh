package com.meinardi.rrhh.infrastructure;

import com.meinardi.rrhh.domain.model.VacancyStatus;
import com.meinardi.rrhh.domain.model.Vacante;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VacanteRepository extends JpaRepository<Vacante, String> {
  List<Vacante> findAllByOrderByFechaCreacionDesc();

  List<Vacante> findByEstadoActualOrderByFechaCreacionDesc(VacancyStatus estadoActual);
}
