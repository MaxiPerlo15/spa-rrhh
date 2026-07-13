package com.meinardi.rrhh.application;

import com.meinardi.rrhh.domain.model.Ubicacion;
import com.meinardi.rrhh.domain.model.VacancyStatus;
import com.meinardi.rrhh.domain.model.Vacante;
import com.meinardi.rrhh.infrastructure.VacanteRepository;
import jakarta.annotation.Nonnull;
import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VacancyManager
    implements CreateVacancyInputBoundary,
        GetVacancyInputBoundary,
        UpdateVacancyInputBoundary,
        ActivateVacancyInputBoundary,
        DeactivateVacancyInputBoundary,
        CloseVacancyInputBoundary,
        ListVacanciesInputBoundary {
  private final VacanteRepository vacanteRepository;

  public VacancyManager(VacanteRepository vacanteRepository) {
    this.vacanteRepository = vacanteRepository;
  }

  @Override
  @Transactional
  @Nonnull
  public Vacante registerVacancy(CreateVacancyCommand command) {
    validateData(command);

    Vacante vacancy =
        Vacante.create(
            command.titulo(),
            command.descripcion(),
            command.requisitos(),
            new Ubicacion(command.ubicacionNombre(), command.ubicacionDescripcion()),
            command.jornada(),
            command.modalidad());

    return vacanteRepository.save(vacancy);
  }

  @Override
  @Transactional(readOnly = true)
  public Vacante getVacancy(String vacancyId) {
    return findVacancy(vacancyId);
  }

  @Override
  @Transactional
  public Vacante updateVacancy(String vacancyId, UpdateVacancyCommand command) {
    validateData(command);

    Vacante vacancy = findVacancy(vacancyId);
    vacancy.updateDetails(
        command.titulo() != null ? command.titulo() : vacancy.getTitulo(),
        command.descripcion() != null ? command.descripcion() : vacancy.getDescripcion(),
        command.requisitos() != null ? command.requisitos() : vacancy.getRequisitos(),
        mergeUbicacion(vacancy, command),
        command.jornada() != null ? command.jornada() : vacancy.getJornada(),
        command.modalidad() != null ? command.modalidad() : vacancy.getModalidad());
    return vacanteRepository.save(vacancy);
  }

  @Override
  @Transactional
  public Vacante activateVacancy(String vacancyId) {
    Vacante vacancy = findVacancy(vacancyId);
    vacancy.activar();
    return vacanteRepository.save(vacancy);
  }

  @Override
  @Transactional
  public Vacante deactivateVacancy(String vacancyId) {
    Vacante vacancy = findVacancy(vacancyId);
    vacancy.desactivar();
    return vacanteRepository.save(vacancy);
  }

  @Override
  @Transactional
  public Vacante closeVacancy(String vacancyId) {
    Vacante vacancy = findVacancy(vacancyId);
    vacancy.cerrar();
    return vacanteRepository.save(vacancy);
  }

  @Override
  @Transactional(readOnly = true)
  public List<Vacante> listVacancies(boolean includeAll) {
    if (includeAll) {
      return vacanteRepository.findAllByOrderByFechaCreacionDesc();
    }

    return vacanteRepository.findByEstadoActualOrderByFechaCreacionDesc(VacancyStatus.ACTIVE);
  }

  private void validateData(CreateVacancyCommand command) {
    if (command == null) {
      throw new IllegalArgumentException("vacancy data is required");
    }
  }

  private void validateData(UpdateVacancyCommand command) {
    if (command == null) {
      throw new IllegalArgumentException("vacancy data is required");
    }
  }

  @Nonnull
  private Vacante findVacancy(String vacancyId) {
    return vacanteRepository
        .findById(vacancyId)
        .orElseThrow(() -> new EntityNotFoundException("vacancy not found"));
  }

  private Ubicacion mergeUbicacion(Vacante vacancy, UpdateVacancyCommand command) {
    Ubicacion currentLocation = vacancy.getUbicacion();
    String nombre =
        command.ubicacionNombre() != null
            ? command.ubicacionNombre()
            : currentLocation != null ? currentLocation.getNombre() : null;
    String descripcion =
        command.ubicacionDescripcion() != null
            ? command.ubicacionDescripcion()
            : currentLocation != null ? currentLocation.getDescripcion() : null;
    return new Ubicacion(nombre, descripcion);
  }
}
