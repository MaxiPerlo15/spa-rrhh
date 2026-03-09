// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Release tracking con Vercel Git SHA
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA 
    ? `spa-rrhh@${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA}` 
    : 'spa-rrhh@dev',
  
  // Environment tracking
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || 'development',

  // Performance monitoring configurable vía ENV (10% por defecto)
  tracesSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || '0.1'),

  // DESHABILITADO: No enviar PII automáticamente (protege datos de candidatos)
  sendDefaultPii: false,

  // Integración de performance tracking para navegador
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;