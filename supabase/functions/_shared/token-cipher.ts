/**
 * AES-256-GCM encryption for OAuth tokens. Deno mirror of
 * src/lib/crypto/token-cipher.ts -- kept intentionally byte-for-byte
 * identical in logic (both run on Web Crypto) since Edge Functions can't
 * import across the Next.js `@/` path alias. Keep the two files in sync.
 *
 * Ciphertext format: base64(iv[12 bytes] || ciphertext+tag).
 */

function getKeyMaterial(): Uint8Array {
  const base64Key = Deno.env.get("TOKEN_ENCRYPTION_KEY");
  if (!base64Key) {
    throw new Error("TOKEN_ENCRYPTION_KEY non configurata.");
  }
  const raw = atob(base64Key);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  if (bytes.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY deve essere una chiave AES-256 di 32 byte codificata in base64.");
  }
  return bytes;
}

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", getKeyMaterial() as BufferSource, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function encryptToken(plainText: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      new TextEncoder().encode(plainText) as BufferSource,
    ),
  );

  const combined = new Uint8Array(iv.length + ciphertext.length);
  combined.set(iv, 0);
  combined.set(ciphertext, iv.length);
  return toBase64(combined);
}

export async function decryptToken(cipherText: string): Promise<string> {
  const key = await getKey();
  const combined = fromBase64(cipherText);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const plainBytes = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    ciphertext as BufferSource,
  );
  return new TextDecoder().decode(plainBytes);
}
