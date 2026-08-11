package com.meinardi.rrhh.infrastructure;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.ObjectProvider;
import com.meinardi.rrhh.application.AuditService;
import com.meinardi.rrhh.application.SessionService;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.core.annotation.Order;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.SecurityContextHolderFilter;

@Configuration
public class SecurityConfig {
  private static final String INTERNAL_API_TOKEN_HEADER = "X-Backend-Api-Key";
  private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  public SessionAuthenticationFilter sessionAuthenticationFilter(
      ObjectProvider<SessionService> sessionService) {
    return new SessionAuthenticationFilter(sessionService::getIfAvailable);
  }

  @Bean
  @Order(1)
  public SecurityFilterChain securityFilterChain(
      HttpSecurity http,
      @Value("${rrhh.security.allow-unauthenticated-vacancy-access:false}")
          boolean allowUnauthenticatedVacancyAccess,
       @Value("${rrhh.security.allow-unauthenticated-mutations:false}")
            boolean allowUnauthenticatedMutations,
         @Value("${rrhh.security.internal-api-token:}") String internalApiToken,
         SessionAuthenticationFilter sessionAuthenticationFilter,
         AuditService auditService)
      throws Exception {
    if (requiresInternalApiToken(allowUnauthenticatedVacancyAccess, allowUnauthenticatedMutations)
        && (internalApiToken == null || internalApiToken.isBlank())) {
      throw new IllegalStateException(
          "rrhh.security.internal-api-token is required when unauthenticated vacancy access is disabled");
    }

    http.csrf(csrf -> csrf.disable())
        .oauth2ResourceServer(oauth2 -> oauth2.disable())
        .exceptionHandling(
            exceptions ->
                exceptions
                    .authenticationEntryPoint(
                        (request, response, exception) -> {
                          recordDenied(request, auditService);
                           if (request.getRequestURI().startsWith("/api/v1/admin/")
                                || isContactMutation(request)
                                || isCandidateCreate(request)
                                || isCandidatePatch(request)
                                || isVacancyAdminMutation(request)) {
                            writeJsonError(response, 401, "unauthorized");
                          } else {
                            response.sendError(403);
                          }
                        })
                     .accessDeniedHandler(
                         (request, response, exception) -> {
                           recordDenied(request, auditService);
                           writeJsonError(response, 403, "forbidden");
                         }))
        .sessionManagement(
            session ->
                session.sessionCreationPolicy(
                    org.springframework.security.config.http.SessionCreationPolicy.IF_REQUIRED))
        .authorizeHttpRequests(
            auth -> {
              auth.requestMatchers("/api/v1/auth/**").permitAll();
              auth.requestMatchers("/api/v1/health").permitAll();

                auth.requestMatchers("/api/v1/admin/**").hasAuthority("admin:access");

              if (allowUnauthenticatedVacancyAccess) {
                auth.requestMatchers(HttpMethod.GET, "/api/v1/vacancies", "/api/v1/vacancies/**")
                    .permitAll();
              } else {
                auth.requestMatchers(HttpMethod.GET, "/api/v1/vacancies", "/api/v1/vacancies/**")
                    .access(
                        (authentication, context) ->
                            new AuthorizationDecision(
                                hasValidInternalApiToken(
                                    context.getRequest().getHeader(INTERNAL_API_TOKEN_HEADER),
                                    internalApiToken)));
              }

                auth.requestMatchers(
                         HttpMethod.PATCH,
                         "/api/v1/vacancies/{id}",
                         "/api/v1/vacancies/{id}/activate",
                         "/api/v1/vacancies/{id}/deactivate",
                         "/api/v1/vacancies/{id}/close")
                    .hasAuthority("admin:access");
               if (allowUnauthenticatedMutations) {
                 auth.requestMatchers(HttpMethod.PATCH, "/api/v1/vacancies/**")
                     .permitAll();
               } else {
                auth.requestMatchers(HttpMethod.PATCH, "/api/v1/vacancies/**")
                    .access(
                        (authentication, context) ->
                            new AuthorizationDecision(
                                hasValidInternalApiToken(
                                    context.getRequest().getHeader(INTERNAL_API_TOKEN_HEADER),
                                    internalApiToken)));
              }
              auth.requestMatchers(HttpMethod.POST, "/api/v1/vacancies")
                  .hasAuthority("admin:access");

              // Public contact submit — no auth required (rate limit + captcha enforced by Next BFF)
              auth.requestMatchers(HttpMethod.POST, "/api/v1/contacts")
                  .permitAll();

              // Admin contact CRUD — requires internal API token
              auth.requestMatchers(HttpMethod.GET, "/api/v1/contacts")
                  .access(
                      (authentication, context) ->
                          new AuthorizationDecision(
                              hasValidInternalApiToken(
                                  context.getRequest().getHeader(INTERNAL_API_TOKEN_HEADER),
                                  internalApiToken)));
              auth.requestMatchers(HttpMethod.GET, "/api/v1/contacts/{id}")
                  .access(
                      (authentication, context) ->
                          new AuthorizationDecision(
                              hasValidInternalApiToken(
                                  context.getRequest().getHeader(INTERNAL_API_TOKEN_HEADER),
                                  internalApiToken)));
               auth.requestMatchers(HttpMethod.PATCH, "/api/v1/contacts/{id}")
                  .hasAuthority("admin:access");
               auth.requestMatchers(HttpMethod.DELETE, "/api/v1/contacts/{id}")
                  .hasAuthority("admin:access");

              // Admin candidate create requires a Spring admin session.
              auth.requestMatchers(HttpMethod.POST, "/api/v1/candidates")
                  .hasAuthority("admin:access");
               auth.requestMatchers(HttpMethod.PATCH, "/api/v1/candidates/{id}")
                   .hasAuthority("admin:access");

              // Public application intake — no auth required (rate limit + captcha enforced by Next BFF)
              auth.requestMatchers(HttpMethod.POST, "/api/v1/applications")
                  .permitAll();

              // Admin application list — requires internal API token
              auth.requestMatchers(HttpMethod.GET, "/api/v1/applications")
                  .access(
                      (authentication, context) ->
                          new AuthorizationDecision(
                              hasValidInternalApiToken(
                                  context.getRequest().getHeader(INTERNAL_API_TOKEN_HEADER),
                                  internalApiToken)));

              // Admin application detail, status update, and delete — requires internal API token
              auth.requestMatchers(HttpMethod.GET, "/api/v1/applications/{id}")
                  .access(
                      (authentication, context) ->
                          new AuthorizationDecision(
                              hasValidInternalApiToken(
                                  context.getRequest().getHeader(INTERNAL_API_TOKEN_HEADER),
                                  internalApiToken)));
              auth.requestMatchers(HttpMethod.PATCH, "/api/v1/applications/{id}/status")
                  .access(
                      (authentication, context) ->
                          new AuthorizationDecision(
                              hasValidInternalApiToken(
                                  context.getRequest().getHeader(INTERNAL_API_TOKEN_HEADER),
                                  internalApiToken)));
              auth.requestMatchers(HttpMethod.DELETE, "/api/v1/applications/{id}")
                  .access(
                      (authentication, context) ->
                          new AuthorizationDecision(
                              hasValidInternalApiToken(
                                  context.getRequest().getHeader(INTERNAL_API_TOKEN_HEADER),
                                  internalApiToken)));

              auth.anyRequest().denyAll();
            });

    return http.addFilterAfter(sessionAuthenticationFilter, SecurityContextHolderFilter.class).build();
  }

  private void writeJsonError(
      jakarta.servlet.http.HttpServletResponse response, int status, String error) throws java.io.IOException {
    response.setStatus(status);
    response.setContentType(org.springframework.http.MediaType.APPLICATION_JSON_VALUE);
    response.getWriter().write("{\"error\":\"" + error + "\"}");
  }

  private boolean hasValidInternalApiToken(String providedToken, String configuredToken) {
    return configuredToken != null
        && !configuredToken.isBlank()
        && configuredToken.equals(providedToken);
  }

  private static void recordDenied(
      jakarta.servlet.http.HttpServletRequest request, AuditService auditService) {
    String path = request.getRequestURI();
    String action;
    String resourceId;
    String resourceType;
    if ("POST".equals(request.getMethod()) && "/api/v1/candidates".equals(path)) {
      action = "candidate.create";
      resourceId = null;
      resourceType = "candidate";
    } else if ("PATCH".equals(request.getMethod()) && path.startsWith("/api/v1/candidates/")) {
      action = "candidate.update";
      resourceId = path.substring("/api/v1/candidates/".length());
      resourceType = "candidate";
    } else if (isContactMutation(request)) {
      action = "PATCH".equals(request.getMethod()) ? "contact.update_status" : "contact.delete";
      resourceId = path.substring("/api/v1/contacts/".length());
      resourceType = "contact";
    } else if (isVacancyAdminMutation(request)) {
      action = vacancyAction(path);
      resourceId = "/api/v1/vacancies".equals(path) ? null : vacancyId(path);
      resourceType = "vacancy";
    } else {
      return;
    }
    try {
      AuditRequestContext auditContext = AuditRequestContextResolver.resolve(request);
      auditService.recordDenied(
          action,
          resourceType,
          resourceId,
          auditContext.ip(),
          auditContext.userAgent(),
          Map.of("reason", "forbidden"));
    } catch (RuntimeException auditFailure) {
      log.error("Unable to persist {} DENIED audit event", action, auditFailure);
    }
  }

  private static boolean isContactMutation(jakarta.servlet.http.HttpServletRequest request) {
    return ("PATCH".equals(request.getMethod()) || "DELETE".equals(request.getMethod()))
        && request.getRequestURI().startsWith("/api/v1/contacts/");
  }

  private static boolean isCandidateCreate(jakarta.servlet.http.HttpServletRequest request) {
    return "POST".equals(request.getMethod())
        && "/api/v1/candidates".equals(request.getRequestURI());
  }

  private static boolean isCandidatePatch(jakarta.servlet.http.HttpServletRequest request) {
    return "PATCH".equals(request.getMethod())
        && request.getRequestURI().startsWith("/api/v1/candidates/");
  }

  private static boolean isVacancyAdminMutation(jakarta.servlet.http.HttpServletRequest request) {
    String path = request.getRequestURI();
    return ("POST".equals(request.getMethod()) && "/api/v1/vacancies".equals(path))
        || ("PATCH".equals(request.getMethod())
             && (path.matches("/api/v1/vacancies/[^/]+")
                 || path.matches("/api/v1/vacancies/[^/]+/(activate|deactivate|close)")));
  }

  private static String vacancyAction(String path) {
    if (path.endsWith("/activate")) return "vacancy.activate";
    if (path.endsWith("/deactivate")) return "vacancy.deactivate";
    if (path.endsWith("/close")) return "vacancy.close";
    return "/api/v1/vacancies".equals(path) ? "vacancy.create" : "vacancy.update";
  }

  private static String vacancyId(String path) {
    String suffix = path.substring("/api/v1/vacancies/".length());
    int actionStart = suffix.indexOf('/');
    return actionStart < 0 ? suffix : suffix.substring(0, actionStart);
  }

  private boolean requiresInternalApiToken(
      boolean allowUnauthenticatedVacancyAccess, boolean allowUnauthenticatedMutations) {
    return !allowUnauthenticatedVacancyAccess || !allowUnauthenticatedMutations;
  }
}
