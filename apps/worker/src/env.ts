export type WorkerBindings = {
  AI?: Ai;
  APP_ENV?: string;
  API_VERSION?: string;
  AI_PROMO_MODEL?: string;
  ALLOWED_ORIGINS?: string;
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  INGEST_SHARED_SECRET: string;
  BOT_TOKEN?: string;
  TELEGRAM_CHANNEL_ID?: string;
  WEBAPP_URL?: string;
  PRIVACY_URL?: string;
  SUPPORT_USERNAME?: string;
  BOT_DESCRIPTION?: string;
  BOT_SHORT_DESCRIPTION?: string;
  TELEGRAM_CHANNEL_USERNAME?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
};

export function requireBinding(
  env: WorkerBindings,
  key: keyof Pick<
    WorkerBindings,
    | "TURSO_DATABASE_URL"
    | "TURSO_AUTH_TOKEN"
    | "INGEST_SHARED_SECRET"
    | "BOT_TOKEN"
    | "TELEGRAM_CHANNEL_ID"
    | "WEBAPP_URL"
    | "PRIVACY_URL"
  >,
): string {
  const value = env[key];
  if (!value || !value.trim()) {
    throw new Error(`Missing required binding: ${key}`);
  }

  return value;
}
