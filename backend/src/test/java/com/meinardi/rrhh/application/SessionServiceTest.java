package com.meinardi.rrhh.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.meinardi.rrhh.domain.model.Permiso;
import com.meinardi.rrhh.domain.model.Rol;
import com.meinardi.rrhh.domain.model.Usuario;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class SessionServiceTest {

  private static final String SESSION_USER_KEY = "authenticatedUser";

  private SessionService sessionService;
  private Usuario testUsuario;
  private Rol testRol;

  @BeforeEach
  void setUp() {
    sessionService = new SessionService();

    Permiso permiso = new Permiso("p1", "vacancies:read", "Read vacancies");
    testRol = new Rol("r1", "ADMIN", "Administrator", Set.of(permiso));
    testUsuario =
        new Usuario("u1", "admin@test.com", "hashed-password", "admin_user", testRol);
  }

  @Test
  void createSessionStoresUserInHttpSession() {
    HttpSession httpSession = mock(HttpSession.class);
    HttpServletRequest request = mock(HttpServletRequest.class);
    when(request.getSession(true)).thenReturn(httpSession);

    sessionService.createSession(request, testUsuario);

    verify(httpSession).setAttribute(SESSION_USER_KEY, testUsuario);
  }

  @Test
  void validateSessionReturnsUserWhenSessionIsValid() {
    HttpSession httpSession = mock(HttpSession.class);
    HttpServletRequest request = mock(HttpServletRequest.class);
    when(request.getSession(false)).thenReturn(httpSession);
    when(httpSession.getAttribute(SESSION_USER_KEY)).thenReturn(testUsuario);

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
    when(httpSession.getAttribute(SESSION_USER_KEY)).thenReturn(null);

    var result = sessionService.validateSession(request);

    assertThat(result).isEmpty();
  }

  @Test
  void invalidateSessionRemovesUserAndInvalidatesSession() {
    HttpSession httpSession = mock(HttpSession.class);
    HttpServletRequest request = mock(HttpServletRequest.class);
    when(request.getSession(false)).thenReturn(httpSession);

    sessionService.invalidateSession(request);

    verify(httpSession).removeAttribute(SESSION_USER_KEY);
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
