// /admin/announcements — list, publish, toggle and delete announcements.
// REAL API (apps/worker/src/routes/admin.ts):
//   GET    /api/admin/announcements        -> { items: AdminAnnouncement[] }
//   POST   /api/admin/announcements        -> { announcement } (title + body required)
//   PATCH  /api/admin/announcements/:id    -> { updated: true } (active toggle / edit)
//   DELETE /api/admin/announcements/:id    -> { deleted: true }
// Active announcements are shown to users via GET /api/announcements.
import { useState } from 'react';
import { AdminLayout, useAdminData } from '../../components/admin/AdminLayout';
import { adminApi, formatWhen, type AdminAnnouncement } from '../../components/admin/AdminApi';
import {
  DangerButton,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
} from '../../components/admin/AdminUi';

export default function AdminAnnouncements() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('all');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const state = useAdminData<{ items: AdminAnnouncement[] }>(
    () => adminApi.get<{ items: AdminAnnouncement[] }>('/api/admin/announcements?limit=50'),
    [refreshKey],
  );

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError('Title and body are both required.');
      return;
    }
    setError(null);
    setNotice(null);
    setPublishing(true);
    try {
      await adminApi.post('/api/admin/announcements', { title: title.trim(), body: body.trim(), audience });
      setTitle('');
      setBody('');
      setAudience('all');
      setNotice('Announcement published — it is now shown to users on the home dashboard.');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publishing failed. Please try again.');
    } finally {
      setPublishing(false);
    }
  }

  async function toggleActive(item: AdminAnnouncement) {
    setError(null);
    setActingId(item.id);
    try {
      await adminApi.patch(`/api/admin/announcements/${item.id}`, { active: !item.active });
      setNotice(item.active ? 'Announcement hidden from users.' : 'Announcement is live again.');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That action failed. Please try again.');
    } finally {
      setActingId(null);
    }
  }

  async function remove(item: AdminAnnouncement) {
    if (!window.confirm(`Delete the announcement “${item.title}”? This cannot be undone.`)) return;
    setError(null);
    setActingId(item.id);
    try {
      await adminApi.del(`/api/admin/announcements/${item.id}`);
      setNotice('Announcement deleted.');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That action failed. Please try again.');
    } finally {
      setActingId(null);
    }
  }

  return (
    <AdminLayout title="Announcements">
      <PageHeader title="Announcements" subtitle="Broadcast messages shown to users on the home dashboard." />
      {notice ? <p role="status" className="mb-4 rounded-2xl border border-[#20B981]/30 bg-[#20B981]/5 px-4 py-3 text-sm text-[#20B981]">{notice}</p> : null}
      {error ? <p role="alert" className="mb-4 rounded-2xl border border-[#E84B65]/30 bg-[#E84B65]/5 px-4 py-3 text-sm text-[#E84B65]">{error}</p> : null}

      <form onSubmit={publish} className="mb-6 rounded-3xl border border-[#E9DFFF] bg-white/80 p-5 shadow-sm backdrop-blur">
        <h2 className="font-semibold text-[#17142C]">Publish a new announcement</h2>
        <label className="mt-3 block text-xs font-semibold text-[#77728C]" htmlFor="ann-title">Title</label>
        <input
          id="ann-title"
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Maintenance on Sunday"
          className="mt-1 w-full rounded-2xl border border-[#E9DFFF] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#873BFA]"
        />
        <label className="mt-3 block text-xs font-semibold text-[#77728C]" htmlFor="ann-body">Message</label>
        <textarea
          id="ann-body"
          value={body}
          maxLength={2000}
          rows={3}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write the announcement…"
          className="mt-1 w-full rounded-2xl border border-[#E9DFFF] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#873BFA]"
        />
        <label className="mt-3 block text-xs font-semibold text-[#77728C]" htmlFor="ann-audience">Audience</label>
        <select
          id="ann-audience"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          className="mt-1 rounded-full border border-[#E9DFFF] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#873BFA]"
        >
          <option value="all">All users</option>
          <option value="verified">Verified users</option>
          <option value="premium">Premium users</option>
        </select>
        <div className="mt-4">
          <PrimaryButton type="submit" disabled={publishing}>{publishing ? 'Publishing…' : 'Publish announcement'}</PrimaryButton>
        </div>
      </form>

      {state.status === 'loading' ? (
        <LoadingState label="Loading announcements" />
      ) : state.status === 'error' ? (
        <ErrorState message={state.message} onRetry={state.retry} />
      ) : state.status === 'denied' ? null : state.data.items.length === 0 ? (
        <EmptyState title="No announcements yet" body="Publish your first announcement with the form above." />
      ) : (
        <ul className="space-y-4">
          {state.data.items.map((item) => (
            <li key={item.id} className="rounded-3xl border border-[#E9DFFF] bg-white/80 p-5 shadow-sm backdrop-blur">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={item.active ? 'active' : 'removed'} />
                <span className="rounded-full bg-[#E9DFFF] px-2.5 py-0.5 text-xs font-semibold text-[#873BFA]">{item.audience}</span>
                <span className="text-xs text-[#77728C]">{formatWhen(item.createdAt)}</span>
              </div>
              <p className="mt-2 font-semibold text-[#17142C]">{item.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-[#211B3B]">{item.body}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <SecondaryButton disabled={actingId === item.id} onClick={() => toggleActive(item)}>
                  {item.active ? 'Hide from users' : 'Show again'}
                </SecondaryButton>
                <DangerButton disabled={actingId === item.id} onClick={() => remove(item)}>Delete</DangerButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminLayout>
  );
}
