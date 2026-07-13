package com.meinardi.rrhh.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.meinardi.rrhh.domain.model.Permiso;
import com.meinardi.rrhh.domain.model.Rol;
import com.meinardi.rrhh.domain.model.Usuario;
import com.meinardi.rrhh.infrastructure.UsuarioRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class SessionServiceTest {

  private SessionService sessionService;
  private UsuarioRepository usuarioRepository;
  private Usuario testUsuario;
  private Rol testRol;

  @BeforeEach
  void setUp() {
    usuarioRepository = mock(UsuarioRepository.class);
    sessionService = new SessionService(usuarioRepository);

    Permiso permiso = new Permiso("p1", "vacancies:read", "Read vacancies");
    testRol = new Rol("r1", "ADMIN", "Administrator", Set.of(permiso));
    testUsuario =
        new Usuario("u1", "admin@test.com", "hashed-password", "admin_user", testRol);
  }

  @Test
  void createSessionStoresAnAuthorizationFingerprintWithTheUserId() {
    HttpSession httpSession = mock(HttpSession.class);
    HttpServletRequest request = mock(HttpServletRequest.class);
    when(request.getSession(true)).thenReturn(httpSession);
    sessionService.createSession(request, testUsuario);
    verify(httpSession)
        .setAttribute(SessionService.SESSION_AUTHORIZATION_FINGERPRINT_KEY, SessionService.authorizationFingerprint(testUsuario));
    verify(httpSession).setAttribute(SessionService.SESSION_USER_ID_KEY, "u1");
  }

  @Test
  void validateSessionReturnsUserWhenSessionIsValid() {
    HttpSession httpSession = mock(HttpSession.class);
    HttpServletRequest request = mock(HttpServletRequest.class);
    when(request.getSession(false)).thenReturn(httpSession);
    when(httpSession.getAttribute(SessionService.SESSION_USER_ID_KEY)).thenReturn("u1");
    when(httpSession.getAttribute(SessionService.SESSION_AUTHORIZATION_FINGERPRINT_KEY))
        .thenReturn(SessionService.authorizationFingerprint(testUsuario));
    when(usuarioRepository.findById("u1")).thenReturn(java.util.Optional.of(testUsuario));

    var result = sessionService.validateSession(request);

    assertThat(result).isPresent();
    assertThat(result.get().getEmail()).isEqualTo("admin@test.com");
    assertThat(result.get().getRol().getNombre()).isEqualTo("ADMIN");
  }

  @Test
  void validateSessionReturnsEmptyWhenNoSession() {
    HttpServletRequest request = mock(HttpServletRequest.class);
    when(request.getSession(false)).thenReturn(null);

    var result = sessionService.validateSession(request);

    assertThat(result).isEmpty();
  }

  @Test
  void validateSessionReturnsEmptyWhenSessionHasNoUser() {
    HttpSession httpSession = mock(HttpSession.class);
    HttpServletRequest request = mock(HttpServletRequest.class);
    when(request.getSession(false)).thenReturn(httpSession);
    when(httpSession.getAttribute(SessionService.SESSION_USER_ID_KEY)).thenReturn(null);

    var result = sessionService.validateSession(request);

    assertThat(result).isEmpty();
  }

  @Test
  void validateSessionInvalidatesWhenPermissionsChangeAfterLogin() {
    HttpSession httpSession = mock(HttpSession.class);
    HttpServletRequest request = mock(HttpServletRequest.class);
    when(request.getSession(false)).thenReturn(httpSession);
    when(httpSession.getAttribute(SessionService.SESSION_USER_ID_KEY)).thenReturn("u1");
    when(httpSession.getAttribute(SessionService.SESSION_AUTHORIZATION_FINGERPRINT_KEY))
        .thenReturn(SessionService.authorizationFingerprint(testUsuario));
    Usuario changedUsuario =
        new Usuario("u1", "admin@test.com", "hashed-password", "admin_user", new Rol("r1", "ADMIN", "Administrator", Set.of()));
    when(usuarioRepository.findById("u1")).thenReturn(java.util.Optional.of(changedUsuario));

    var result = sessionService.validateSession(request);

    assertThat(result).isEmpty();
    verify(httpSession).invalidate();
  }

  @Test
  void invalidateSessionRemovesUserAndInvalidatesSession() {
    HttpSession httpSession = mock(HttpSession.class);
    HttpServletRequest request = mock(HttpServletRequest.class);
    when(request.getSession(false)).thenReturn(httpSession);

    sessionService.invalidateSession(request);

    verify(httpSession).removeAttribute(SessionService.SESSION_USER_ID_KEY);
    verify(httpSession).removeAttribute(SessionService.SESSION_AUTHORIZATION_FINGERPRINT_KEY);
    verify(httpSession).invalidate();
  }

  @Test
  void invalidateSessionDoesNothingWhenNoSession() {
    HttpServletRequest request = mock(HttpServletRequest.class);
    when(request.getSession(false)).thenReturn(null);

    sessionService.invalidateSession(request);

    verify(request, never()).getSession(true);
  }
}
