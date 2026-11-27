import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
// Password hashing.
// - Node dev: Argon2id via the optional `argon2` package if installed (preferred,
//   PHC string $argon2id$...). `argon2` is an OPTIONAL dependency: it needs a
//   native build, which some sandboxes block; when absent, PBKDF2 below is used.
// - Cloudflare Workers: argon2 has no WebCrypto-compatible build, so the
//   fallback is PBKDF2-SHA256 (100k iterations, 32-byte salt) via WebCrypto
//   subtle crypto, stored as $pbkdf2$... — clearly marked, never plaintext.
// verifyPassword() dispatches on the stored prefix, so hashes made in either
// runtime verify in the other.
export async function hashPassword(password: string): Promise<string> {
  try {
    // Dynamic import so Workers bundling never pulls in the native module.
    const argon2: any = await import('argon2');
    return await argon2.hash(password, { type: argon2.argon2id });
  } catch {
    return hashPbkdf2(password);
  }
}
export async function hashPbkdf2(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt as BufferSource, iterations: 100_000, hash: 'SHA-256' }, key, 256);
  return `$pbkdf2$100000$${salt.toString('base64')}$${Buffer.from(bits).toString('base64')}`;
}
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    if (hash.startsWith('$argon2')) {
      const argon2: any = await import('argon2');
      return await argon2.verify(hash, password);
    }
    if (hash.startsWith('$pbkdf2$')) {
      const [, , iter, saltB64, hashB64] = hash.split('$');
      const salt = Buffer.from(saltB64, 'base64');
      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
      const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt as BufferSource, iterations: Number(iter), hash: 'SHA-256' }, key, 256);
      const a = Buffer.from(bits); const b = Buffer.from(hashB64, 'base64');
      return a.length === b.length && timingSafeEqual(a, b);
    }
    return false;
  } catch { return false; }
}
export function sha256Hex(input: string): string { return createHash('sha256').update(input).digest('hex'); }
export function randomToken(): string { return randomBytes(32).toString('hex'); }
