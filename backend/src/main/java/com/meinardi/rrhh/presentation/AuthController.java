package com.meinardi.rrhh.presentation;

import com.meinardi.rrhh.application.SessionService;
import com.meinardi.rrhh.domain.model.Usuario;
import com.meinardi.rrhh.infrastructure.UsuarioRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

  private final SessionService sessionService;
  private final UsuarioRepository usuarioRepository;
  private final PasswordEncoder passwordEncoder;

  public AuthController(
      SessionService sessionService,
      UsuarioRepository usuarioRepository,
      PasswordEncoder passwordEncoder) {
    this.sessionService = sessionService;
    this.usuarioRepository = usuarioRepository;
    this.passwordEncoder = passwordEncoder;
  }

  @PostMapping("/login")
  @Transactional(readOnly = true)
  public ResponseEntity<?> login(
      @Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
    return usuarioRepository
        .findByEmail(request.email())
        .filter(usuario -> passwordEncoder.matches(request.password(), usuario.getPassword()))
        .map(
            usuario -> {
              sessionService.createSession(httpRequest, usuario);
              return ResponseEntity.ok(toLoginResponse(usuario));
            })
        .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
  }

  @GetMapping("/me")
  public ResponseEntity<LoginResponse> me(Authentication authentication) {
    return authenticatedUser(authentication)
        .map(usuario -> ResponseEntity.ok(toLoginResponse(usuario)))
        .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
  }

  @PostMapping("/logout")
  public ResponseEntity<Void> logout(
      Authentication authentication, HttpServletRequest request, HttpServletResponse response) {
    return authenticatedUser(authentication)
        .map(
            usuario -> {
              sessionService.invalidateSession(request, response);
              return ResponseEntity.noContent().<Void>build();
            })
        .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
  }

  private java.util.Optional<Usuario> authenticatedUser(Authentication authentication) {
    if (authentication == null || !(authentication.getPrincipal() instanceof Usuario usuario)) {
      return java.util.Optional.empty();
    }
    return java.util.Optional.of(usuario);
  }

  private LoginResponse toLoginResponse(Usuario usuario) {
    List<String> permisos =
        usuario.getRol().getPermisos().stream()
            .map(p -> p.getNombre())
            .collect(Collectors.toList());

    LoginResponse.RolDto rolDto =
        new LoginResponse.RolDto(usuario.getRol().getId(), usuario.getRol().getNombre(), permisos);

    return new LoginResponse(usuario.getId(), usuario.getEmail(), usuario.getNombreUsuario(), rolDto);
  }
}
