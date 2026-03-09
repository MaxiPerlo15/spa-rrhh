// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Realease tracking con Vercel Git SHA
  release: process.env.VERCEL_GIT_COMMIT_SHA
  ? `spa-rrhh@${process.env.VERCEL_GIT_COMMIT_SHA}`
  : 'spa-rrhh@dev',
  
  // Environment tracking
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',

  // Performance monitoring configurable via ENV
  tracesSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || '0.1'),

  // DESHABILITADO: No enviar PII automáticamente
  sendDefaultPii: false
});
