// Resend integration — DEV/TEST MODE ONLY.
// No API key is stored in code. RESEND_API_KEY is read from env only.
// In dev (no key / RESEND_DEV_MODE=1) the email is logged to console and
// NOT sent. Production requires a verified domain in Resend + RESEND_FROM
// set to an address on that domain; see final report / docs for Agent C.
export interface MailInput { to: string; subject: string; text: string; html?: string }
export async function sendMail(env: Record<string, string | undefined>, input: MailInput): Promise<{ sent: boolean; devMode: boolean }> {
  const key = env.RESEND_API_KEY;
  if (!key) {
    console.log(`[mailer:dev] To: ${input.to}\nSubject: ${input.subject}\n${input.text}`);
    return { sent: false, devMode: true };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.RESEND_FROM ?? 'Crush and Confo <noreply@example.com>', to: [input.to], subject: input.subject, text: input.text, html: input.html ?? `<p>${input.text}</p>` }),
  });
  if (!res.ok) { console.error('[mailer] Resend error', res.status, await res.text().catch(() => '')); return { sent: false, devMode: false }; }
  return { sent: true, devMode: false };
}
export const verificationEmail = (name: string, link: string) => ({ subject: 'Verify your Crush and Confo email', text: `Hi ${name},\n\nVerify your email by visiting:\n${link}\n\nThis link expires in 24 hours and can only be used once.\n\n— Crush and Confo` });
export const resetEmail = (name: string, link: string) => ({ subject: 'Reset your Crush and Confo password', text: `Hi ${name},\n\nReset your password:\n${link}\n\nThis link expires in 1 hour and can only be used once. If you did not request this, ignore this email.\n\n— Crush and Confo` });
