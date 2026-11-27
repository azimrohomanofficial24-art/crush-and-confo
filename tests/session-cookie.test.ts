import { describe, expect, it } from 'vitest';
import { sessionCookieHeader, clearSessionCookieHeader, verifySession, requestIsHttps } from '../apps/worker/src/auth/session';

// Regression tests for the 2026-11-27 login audit:
// - the session cookie must be Secure on https (production) and NOT Secure
//   on plain http (local dev), decided from the request URL — the old code
//   keyed off process.env.NODE_ENV, which is unset on Workers, so the
//   production cookie was never Secure.
// - login must never be blocked on email verification (there is no such
//   check in the login route; this test pins the cookie round-trip that
//   login depends on).
describe('session cookie (login audit)', () => {
  it('sets Secure on https and omits it on http', () => {
    const https = sessionCookieHeader('s3cret', 'user-1', true);
    expect(https).toContain('cc_session=');
    expect(https).toContain('; Secure');
    expect(https).toContain('HttpOnly');
    expect(https).toContain('SameSite=Lax');
    const http = sessionCookieHeader('s3cret', 'user-1', false);
    expect(http).not.toContain('; Secure');
  });

  it('clears with matching Secure flag', () => {
    expect(clearSessionCookieHeader(true)).toContain('; Secure');
    expect(clearSessionCookieHeader(false)).not.toContain('; Secure');
    expect(clearSessionCookieHeader()).toContain('Max-Age=0');
  });

  it('requestIsHttps reads the request URL protocol', () => {
    expect(requestIsHttps({ req: { url: 'https://crush-and-confo.crush-and-confo.workers.dev/api/auth/login' } })).toBe(true);
    expect(requestIsHttps({ req: { url: 'http://localhost:8791/api/auth/login' } })).toBe(false);
  });

  it('a cookie signed with the secret verifies, and a wrong secret does not', () => {
    const header = sessionCookieHeader('s3cret', 'user-1', true);
    const value = header.split(';')[0].slice('cc_session='.length);
    expect(verifySession('s3cret', value)).toEqual({ id: 'user-1' });
    expect(verifySession('other-secret', value)).toBeNull();
    expect(verifySession('s3cret', undefined)).toBeNull();
  });
});
