package com.meinardi.rrhh.application;

import com.meinardi.rrhh.domain.model.Usuario;
import com.meinardi.rrhh.infrastructure.UsuarioRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Comparator;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class SessionService {

  static final String SESSION_USER_ID_KEY = "authenticatedUserId";
  static final String SESSION_AUTHORIZATION_FINGERPRINT_KEY = "authorizationFingerprint";

  private final UsuarioRepository usuarioRepository;
  private final boolean sessionCookieSecure;

  public SessionService(
      UsuarioRepository usuarioRepository,
      @Value("${server.servlet.session.cookie.secure:true}") boolean sessionCookieSecure) {
    this.usuarioRepository = usuarioRepository;
    this.sessionCookieSecure = sessionCookieSecure;
  }

  public void createSession(HttpServletRequest request, Usuario usuario) {
    HttpSession session = request.getSession(true);
    session.setAttribute(SESSION_USER_ID_KEY, usuario.getId());
    session.setAttribute(SESSION_AUTHORIZATION_FINGERPRINT_KEY, authorizationFingerprint(usuario));
  }


  public Optional<Usuario> validateSession(HttpServletRequest request) {
    return validateSession(request, null);
  }

  public Optional<Usuario> validateSession(
      HttpServletRequest request, HttpServletResponse response) {
    HttpSession session = request.getSession(false);
    if (session == null) {
      return Optional.empty();
    }
    Object userId = session.getAttribute(SESSION_USER_ID_KEY);
    Object fingerprint = session.getAttribute(SESSION_AUTHORIZATION_FINGERPRINT_KEY);
    if (!(userId instanceof String id) || !(fingerprint instanceof String expectedFingerprint)) {
      invalidateSession(request, response);
      return Optional.empty();
    }

    Optional<Usuario> usuario = usuarioRepository.findById(id);
    if (usuario.isEmpty()
        || !usuario.get().isEnabled()
        || !authorizationFingerprint(usuario.get()).equals(expectedFingerprint)) {
      invalidateSession(request, response);
      return Optional.empty();
    }
    return usuario;
  }

  public void invalidateSession(HttpServletRequest request) {
    invalidateSession(request, null);
  }

  public void invalidateSession(HttpServletRequest request, HttpServletResponse response) {
    HttpSession session = request.getSession(false);
    if (session != null) {
      session.removeAttribute(SESSION_USER_ID_KEY);
      session.removeAttribute(SESSION_AUTHORIZATION_FINGERPRINT_KEY);
      session.invalidate();
      if (response != null) {
        response.addHeader("Set-Cookie", expiredSessionCookie());
      }
    }
  }

  private String expiredSessionCookie() {
    return "SESSIONID=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax"
        + (sessionCookieSecure ? "; Secure" : "");
  }

  static String authorizationFingerprint(Usuario usuario) {
    String authorities =
        usuario.getRol().getPermisos().stream()
            .map(permiso -> permiso.getNombre())
            .sorted(Comparator.naturalOrder())
            .reduce(usuario.getRol().getId(), (roleId, permission) -> roleId + ":" + permission);
    try {
      byte[] digest = MessageDigest.getInstance("SHA-256").digest(authorities.getBytes(StandardCharsets.UTF_8));
      return java.util.HexFormat.of().formatHex(digest);
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("SHA-256 must be available", exception);
    }
  }

}
