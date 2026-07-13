package com.meinardi.rrhh.application;

import com.meinardi.rrhh.domain.model.Usuario;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class SessionService {

  private static final String SESSION_USER_KEY = "authenticatedUser";

  public void createSession(HttpServletRequest request, Usuario usuario) {
    HttpSession session = request.getSession(true);
    session.setAttribute(SESSION_USER_KEY, usuario);
  }


  public Optional<Usuario> validateSession(HttpServletRequest request) {
    HttpSession session = request.getSession(false);
    if (session == null) {
      return Optional.empty();
    }
    Object user = session.getAttribute(SESSION_USER_KEY);
    if (user instanceof Usuario usuario) {
      return Optional.of(usuario);
    }
    return Optional.empty();
  }

  public void invalidateSession(HttpServletRequest request) {
    HttpSession session = request.getSession(false);
    if (session != null) {
      session.removeAttribute(SESSION_USER_KEY);
      session.invalidate();
    }
  }

}
