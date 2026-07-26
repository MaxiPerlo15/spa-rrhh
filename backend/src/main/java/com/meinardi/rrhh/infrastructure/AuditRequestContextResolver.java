package com.meinardi.rrhh.infrastructure;

import jakarta.servlet.http.HttpServletRequest;
import java.net.InetAddress;
import java.net.UnknownHostException;

public final class AuditRequestContextResolver {
  private static final int MAX_USER_AGENT_LENGTH = 512;

  private AuditRequestContextResolver() {}

  public static AuditRequestContext resolve(HttpServletRequest request) {
    String forwardedFor = request.getHeader("X-Forwarded-For");
    String ip = isIpAddress(forwardedFor) ? forwardedFor : safeRemoteAddress(request.getRemoteAddr());
    return new AuditRequestContext(ip, safeUserAgent(request.getHeader("User-Agent")));
  }

  private static String safeRemoteAddress(String remoteAddress) {
    return isIpAddress(remoteAddress) ? remoteAddress : null;
  }

  private static String safeUserAgent(String userAgent) {
    if (userAgent == null
        || userAgent.isBlank()
        || userAgent.length() > MAX_USER_AGENT_LENGTH
        || userAgent.indexOf('\r') >= 0
        || userAgent.indexOf('\n') >= 0) return null;
    return userAgent;
  }

  private static boolean isIpAddress(String value) {
    return isIpv4(value) || isIpv6(value);
  }

  private static boolean isIpv4(String value) {
    if (value == null) return false;
    String[] octets = value.split("\\.", -1);
    if (octets.length != 4) return false;
    for (String octet : octets) {
      if (octet.isEmpty() || octet.length() > 3 || (octet.length() > 1 && octet.startsWith("0"))) return false;
      for (int index = 0; index < octet.length(); index++)
        if (octet.charAt(index) < '0' || octet.charAt(index) > '9') return false;
      if (Integer.parseInt(octet) > 255) return false;
    }
    return true;
  }

  private static boolean isIpv6(String value) {
    if (value == null || value.length() > 45 || !value.matches("[0-9a-fA-F:.]+")) return false;
    try {
      return value.contains(":") && InetAddress.getByName(value).getAddress().length == 16;
    } catch (UnknownHostException invalidIp) {
      return false;
    }
  }
}
