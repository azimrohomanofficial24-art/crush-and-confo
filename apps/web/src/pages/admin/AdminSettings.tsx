// /admin/settings — platform settings + service status.
// REAL API (apps/worker/src/routes/admin.ts):
//   GET /api/admin/settings        -> { items: Record<string, string> } (platform_settings table)
//   PUT /api/admin/settings/:key   -> body { value } (audit-logged server-side)
// Settings are a flat key/value map, so this page edits known keys and saves each
// changed key with its own PUT. Email/storage health is NOT exposed by the API,
// so the page says so instead of inventing a status. Secrets are never shown here.
import { useState, type FormEvent } from 'react';
import { AdminLayout, useAdminData } from '../../components/admin/AdminLayout';
import { adminApi, type PlatformSettingsMap } from '../../components/admin/AdminApi';
import { ErrorState, LoadingState, PageHeader, PrimaryButton } from '../../components/admin/AdminUi';

const KNOWN_KEYS = [
  { key: 'registration_open', label: 'Registration open', type: 'boolean' as const, hint: 'Whether new users can register.' },
  { key: 'require_email_verification', label: 'Require email verification', type: 'boolean' as const, hint: 'Whether accounts must verify their email.' },
  { key: 'min_age', label: 'Minimum age', type: 'number' as const, hint: 'Minimum age to register (18+ enforced server-side).' },
  { key: 'maintenance_mode', label: 'Maintenance mode', type: 'boolean' as const, hint: 'When on, the public site shows a maintenance message.' },
  { key: 'maintenance_message', label: 'Maintenance message', type: 'text' as const, hint: 'Message shown while maintenance mode is on.' },
  { key: 'max_upload_mb', label: 'Max upload size (MB)', type: 'number' as const, hint: 'Maximum upload size in megabytes.' },
];

export default function AdminSettings() {
  const state = useAdminData<{ items: PlatformSettingsMap }>(() => adminApi.get<{ items: PlatformSettingsMap }>('/api/admin/settings'));
  const [draft, setDraft] = useState<PlatformSettingsMap | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const settings = draft ?? (state.status === 'ok' ? state.data.items : null);

  function setValue(key: string, value: string) {
    if (settings) setDraft({ ...settings, [key]: value });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!settings || state.status !== 'ok') return;
    setError(null);
    setSaving(true);
    try {
      const original = state.data.items;
      const changed = KNOWN_KEYS.filter((k) => (settings[k.key] ?? '') !== (original[k.key] ?? ''));
      for (const k of changed) {
        await adminApi.put(`/api/admin/settings/${k.key}`, { value: settings[k.key] ?? '' });
      }
      setNotice(changed.length === 0 ? 'Nothing changed.' : `Saved ${changed.length} setting(s).`);
      setDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout title="Settings">
      <PageHeader title="Platform settings" subtitle="Registration, verification, maintenance mode and service status." />
      {notice ? <p role="status" className="mb-4 rounded-2xl border border-[#20B981]/30 bg-[#20B981]/5 px-4 py-3 text-sm text-[#20B981]">{notice}</p> : null}
      {error ? <p role="alert" className="mb-4 rounded-2xl border border-[#E84B65]/30 bg-[#E84B65]/5 px-4 py-3 text-sm text-[#E84B65]">{error}</p> : null}

      {state.status === 'loading' || !settings ? (
        state.status === 'error' ? <ErrorState message={state.message} onRetry={state.retry} /> : <LoadingState label="Loading settings" />
      ) : state.status === 'denied' ? null : (
        <form onSubmit={onSubmit} className="space-y-4">
          <section className="rounded-3xl border border-[#E9DFFF] bg-white/80 p-5 shadow-sm backdrop-blur">
            <h2 className="font-semibold text-[#17142C]">Registration &amp; safety</h2>
            <div className="mt-4 space-y-4 text-sm">
              {KNOWN_KEYS.map((k) => (
                <div key={k.key}>
                  {k.type === 'boolean' ? (
                    <label className="flex items-center justify-between gap-4">
                      <span>{k.label}<span className="block text-xs font-normal text-[#77728C]">{k.hint}</span></span>
                      <input
                        type="checkbox"
                        checked={settings[k.key] === 'true' || settings[k.key] === '1'}
                        onChange={(e) => setValue(k.key, e.target.checked ? 'true' : 'false')}
                        className="h-5 w-5 accent-[#873BFA]"
                      />
                    </label>
                  ) : (
                    <label className="block">
                      <span className="font-medium">{k.label}</span>
                      <span className="block text-xs font-normal text-[#77728C]">{k.hint}</span>
                      <input
                        type={k.type === 'number' ? 'number' : 'text'}
                        min={k.key === 'min_age' ? 18 : undefined}
                        value={settings[k.key] ?? ''}
                        onChange={(e) => setValue(k.key, e.target.value)}
                        placeholder={k.key === 'min_age' ? '18' : undefined}
                        className="mt-1 w-full rounded-2xl border border-[#E9DFFF] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#873BFA]"
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-[#E9DFFF] bg-white/80 p-5 shadow-sm backdrop-blur">
            <h2 className="font-semibold text-[#17142C]">Services</h2>
            <p className="mt-3 text-sm text-[#77728C]">
              Email (Resend) and storage (R2) health are not exposed by the settings API, so no status is shown here.
              Email runs in Resend dev mode until a domain is verified — see docs/EMAIL.md. Credentials live only in
              Cloudflare / environment secrets and are never shown or edited here.
            </p>
          </section>

          <PrimaryButton type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</PrimaryButton>
        </form>
      )}
    </AdminLayout>
  );
}
