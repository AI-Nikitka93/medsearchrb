import { createClient, type Client } from "@libsql/client/web";

import type { WorkerBindings } from "../env";
import { requireBinding } from "../env";

let clientCache: Client | null = null;
let pragmaCache: Promise<void> | null = null;

export type SqlExecutor = {
  execute: Client["execute"];
};

export function getClient(env: WorkerBindings): Client {
  if (!clientCache) {
    clientCache = createClient({
      url: requireBinding(env, "TURSO_DATABASE_URL"),
      authToken: requireBinding(env, "TURSO_AUTH_TOKEN"),
    });
  }

  return clientCache;
}

export async function ensureDbReady(env: WorkerBindings): Promise<Client> {
  const client = getClient(env);
  if (!pragmaCache) {
    pragmaCache = client
      .execute("PRAGMA foreign_keys = ON")
      .then(() => undefined);
  }

  await pragmaCache;
  return client;
}
