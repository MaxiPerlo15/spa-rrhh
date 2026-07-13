package com.meinardi.rrhh.infrastructure;

import com.meinardi.rrhh.application.SessionService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.function.Supplier;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
public class SessionAuthenticationFilter extends OncePerRequestFilter {
  private final Supplier<SessionService> sessionService;

  public SessionAuthenticationFilter(SessionService sessionService) {
    this(() -> sessionService);
  }
  public SessionAuthenticationFilter(Supplier<SessionService> sessionService) {
    this.sessionService = sessionService;
  }
  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    SecurityContext context = SecurityContextHolder.createEmptyContext();
    SecurityContextHolder.setContext(context);
    try {
      SessionService service = sessionService.get();
      if (service != null) {
        service
            .validateSession(request, response)
            .ifPresent(
                usuario ->
                    context.setAuthentication(
                        new UsernamePasswordAuthenticationToken(
                            usuario,
                            null,
                            usuario.getRol().getPermisos().stream()
                                .map(permiso -> new SimpleGrantedAuthority(permiso.getNombre()))
                                .toList())));
      }
      filterChain.doFilter(request, response);
    } finally {
      SecurityContextHolder.clearContext();
    }
  }
}
