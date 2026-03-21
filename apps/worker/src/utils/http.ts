import type { Context } from "hono";

export function requestId(c: Context): string {
  return c.req.header("cf-ray") ?? crypto.randomUUID();
}

export function errorJson(
  c: Context,
  status: number,
  code: string,
  message: string,
  retryable = false,
) {
  return c.json(
    {
      error: {
        code,
        message,
        request_id: requestId(c),
        retryable,
      },
    },
    status as never,
  );
}

export function parsePositiveInt(
  value: string | undefined,
  fallback: number,
  max: number,
): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(Math.floor(parsed), max);
}
