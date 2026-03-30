const TELEGRAM_WEBAPP_DATA_KEY = "WebAppData";

export type TelegramInitDataUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
};

export type VerifiedTelegramInitData = {
  auth_date: number;
  can_send_after: number | null;
  chat_instance: string | null;
  chat_type: string | null;
  query_id: string | null;
  start_param: string | null;
  user: TelegramInitDataUser | null;
};

function textEncoder() {
  return new TextEncoder();
}

function encode(value: string) {
  return textEncoder().encode(value);
}

function hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((item) => item.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

async function hmacSha256(
  keyData: BufferSource,
  value: string,
): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );

  return crypto.subtle.sign("HMAC", cryptoKey, encode(value));
}

function parseOptionalJson<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function buildDataCheckString(params: URLSearchParams) {
  return Array.from(params.entries())
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

export async function verifyTelegramInitData(args: {
  botToken: string;
  initData: string;
  maxAgeSeconds: number;
  now?: Date;
}): Promise<VerifiedTelegramInitData> {
  const initData = args.initData.trim();
  if (!initData) {
    throw new Error("initData is empty");
  }

  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash")?.trim().toLowerCase();
  if (!receivedHash) {
    throw new Error("initData hash is missing");
  }

  const authDate = Number(params.get("auth_date"));
  if (!Number.isFinite(authDate) || authDate < 1) {
    throw new Error("initData auth_date is invalid");
  }

  const dataCheckString = buildDataCheckString(params);
  const secretKey = await hmacSha256(encode(TELEGRAM_WEBAPP_DATA_KEY), args.botToken);
  const calculatedHash = hex(await hmacSha256(secretKey, dataCheckString));

  if (!constantTimeEqual(calculatedHash, receivedHash)) {
    throw new Error("initData hash mismatch");
  }

  const nowSeconds = Math.floor((args.now ?? new Date()).getTime() / 1000);
  if (Math.abs(nowSeconds - authDate) > args.maxAgeSeconds) {
    throw new Error("initData is expired");
  }

  return {
    auth_date: authDate,
    can_send_after: params.get("can_send_after")
      ? Number(params.get("can_send_after"))
      : null,
    chat_instance: params.get("chat_instance"),
    chat_type: params.get("chat_type"),
    query_id: params.get("query_id"),
    start_param: params.get("start_param"),
    user: parseOptionalJson<TelegramInitDataUser>(params.get("user")),
  };
}
