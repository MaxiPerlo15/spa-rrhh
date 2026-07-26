package com.meinardi.rrhh.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class AuditRequestContextResolverTest {

  @Test
  void preservesValidBffForwardedIpAndUserAgent() {
    MockHttpServletRequest request = request("10.0.0.4", "203.0.113.10", "BFF test agent");

    AuditRequestContext context = AuditRequestContextResolver.resolve(request);

    assertThat(context.ip()).isEqualTo("203.0.113.10");
    assertThat(context.userAgent()).isEqualTo("BFF test agent");
  }

  @Test
  void fallsBackToValidRemoteAddressWhenForwardedIpIsMalformed() {
    AuditRequestContext context =
        AuditRequestContextResolver.resolve(request("10.0.0.4", "203.0.113.+10", "BFF test agent"));

    assertThat(context.ip()).isEqualTo("10.0.0.4");
  }

  @Test
  void dropsUserAgentContainingLineBreaks() {
    AuditRequestContext context =
        AuditRequestContextResolver.resolve(request("10.0.0.4", "203.0.113.10", "browser\r\ninjected"));

    assertThat(context.userAgent()).isNull();
  }

  @Test
  void dropsOverlongUserAgent() {
    AuditRequestContext context =
        AuditRequestContextResolver.resolve(request("10.0.0.4", "203.0.113.10", "a".repeat(513)));

    assertThat(context.userAgent()).isNull();
  }

  private MockHttpServletRequest request(String remoteAddress, String forwardedFor, String userAgent) {
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.setRemoteAddr(remoteAddress);
    request.addHeader("X-Forwarded-For", forwardedFor);
    request.addHeader("User-Agent", userAgent);
    return request;
  }
}
