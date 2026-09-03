/**
 * Minimal client-side error reporting hook.
 *
 * Wire this up to a real error-tracking service (Sentry, LogRocket, etc.)
 * when you're ready — for now it just logs to the console so failures
 * captured by the root error boundary aren't silently swallowed.
 */
export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  const message =
    error instanceof Response
      ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`
      : error instanceof Error
        ? error.message
        : String(error);

  console.error("[HayatPulse]", message, {
    route: window.location.pathname,
    ...context,
    ...(error instanceof Error ? { stack: error.stack } : {}),
  });
}