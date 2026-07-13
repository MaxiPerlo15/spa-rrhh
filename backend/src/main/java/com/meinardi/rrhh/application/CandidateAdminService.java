package com.meinardi.rrhh.application;

import com.meinardi.rrhh.domain.model.Candidato;
import com.meinardi.rrhh.domain.model.Postulacion;
import com.meinardi.rrhh.infrastructure.CandidatoRepository;
import com.meinardi.rrhh.infrastructure.PostulacionRepository;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CandidateAdminService {

  private final CandidatoRepository candidatoRepository;
  private final PostulacionRepository postulacionRepository;

  public CandidateAdminService(
      CandidatoRepository candidatoRepository, PostulacionRepository postulacionRepository) {
    this.candidatoRepository = candidatoRepository;
    this.postulacionRepository = postulacionRepository;
  }

  public record CreateResult(String candidateId, String applicationId) {}

  public record UpdateResult(String candidateId) {}

  @Transactional
  public CreateResult manualCreate(
      String candidateName, String email, String phone, String notes) {
    String personKey = ApplicationManager.buildPersonKey(email, phone);

    Optional<Candidato> existing = candidatoRepository.findByPersonKey(personKey);
    if (existing.isPresent()) {
      throw new IllegalArgumentException("DUPLICATE_CANDIDATE");
    }

    Candidato candidato = Candidato.create(candidateName, email, phone, notes);
    candidato.setPersonKey(personKey);
    Candidato savedCandidato = candidatoRepository.save(candidato);

    Postulacion postulacion = Postulacion.createSpontaneous(savedCandidato, notes);
    Postulacion savedPostulacion = postulacionRepository.save(postulacion);

    return new CreateResult(savedCandidato.getId(), savedPostulacion.getId());
  }

  @Transactional
  public UpdateResult updateIdentity(
      String id, String candidateName, String email, String phone) {
    Candidato candidato =
        candidatoRepository
            .findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Candidate not found"));

    String nextPersonKey = ApplicationManager.buildPersonKey(email, phone);

    Optional<Candidato> conflicting = candidatoRepository.findByPersonKey(nextPersonKey);
    if (conflicting.isPresent() && !conflicting.get().getId().equals(candidato.getId())) {
      throw new IllegalArgumentException("CANDIDATE_IDENTITY_CONFLICT");
    }

    candidato.setNombre(candidateName);
    candidato.setEmail(email);
    candidato.setTelefono(phone);
    candidato.setPersonKey(nextPersonKey);
    candidato.setUpdatedAt(OffsetDateTime.now());
    candidatoRepository.save(candidato);

    return new UpdateResult(candidato.getId());
  }
}
