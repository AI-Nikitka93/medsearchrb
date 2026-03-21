function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((item) => item.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return bufferToHex(hash);
}

export async function shortHash(input: string, length = 10): Promise<string> {
  const value = await sha256(input);
  return value.slice(0, length);
}
