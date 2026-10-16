import * as Sentry from "@sentry/nextjs";

type Attributes = Record<string, string | number | boolean>;

export function traced<T>(
  name: string,
  attributes: Attributes,
  run: () => Promise<T>,
): Promise<T> {
  if (!process.env.SENTRY_DSN) return run();
  return Sentry.startSpan({ name, op: "scopelock.agent", attributes }, run);
}
