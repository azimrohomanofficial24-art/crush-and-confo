// /admin/moderation — confessions queue (live) + posts queue (live).
// REAL API (apps/worker/src/routes/admin.ts):
//   GET  /api/admin/confessions            -> { items: AdminConfession[] }
//   POST /api/admin/confessions/:id/hide   -> { hidden: true }
//   GET  /api/admin/posts                  -> { items: AdminPost[] }
//   POST /api/admin/posts/:id/hide         -> { hidden: true }
// Anonymous confessions: the admin list exposes authorId for investigation only.
// This page shows "Anonymous confession" as the author label and never reveals the
// author's identity in the public-facing sense; the id is shown truncated in the
// detail line for abuse investigation, per the platform's moderation policy.
import { useState } from 'react';
import { AdminLayout, useAdminData } from '../../components/admin/AdminLayout';
import { adminApi, formatWhen, shortId, type AdminConfession, type AdminPost } from '../../components/admin/AdminApi';
import {
  DangerButton,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StatusBadge,
} from '../../components/admin/AdminUi';

export default function AdminModeration() {
  const [tab, setTab] = useState<'confessions' | 'posts'>('confessions');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const state = useAdminData<{ items: AdminConfession[] }>(
    () => adminApi.get<{ items: AdminConfession[] }>('/api/admin/confessions?limit=50'),
    [refreshKey],
  );
  const postsState = useAdminData<{ items: AdminPost[] }>(
    () => adminApi.get<{ items: AdminPost[] }>('/api/admin/posts?limit=50'),
    [refreshKey],
  );

  async function hideConfession(item: AdminConfession) {
    if (!window.confirm('Hide this confession? It will no longer be visible on the site.')) return;
    setNotice(null);
    setError(null);
    setActingId(item.id);
    try {
      await adminApi.post(`/api/admin/confessions/${item.id}/hide`);
      setNotice('Confession hidden.');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That action failed. Please try again.');
    } finally {
      setActingId(null);
    }
  }

  async function hidePost(item: AdminPost) {
    if (!window.confirm('Hide this post? It will no longer be visible on the site.')) return;
    setNotice(null);
    setError(null);
    setActingId(item.id);
    try {
      await adminApi.post(`/api/admin/posts/${item.id}/hide`);
      setNotice('Post hidden.');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That action failed. Please try again.');
    } finally {
      setActingId(null);
    }
  }

  return (
    <AdminLayout title="Moderation">
      <PageHeader title="Moderation" subtitle="Review confessions and posts. Anonymous confessions never reveal the author's identity to the public; admins can investigate abuse via the admin-only record." />
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Moderation queue">
        {(['confessions', 'posts'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            aria-pressed={tab === k}
            className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${tab === k ? 'bg-[#17142C] text-white' : 'border border-[#E9DFFF] bg-white text-[#211B3B]'}`}
          >
            {k}
          </button>
        ))}
      </div>
      {notice ? <p role="status" className="mb-4 rounded-2xl border border-[#20B981]/30 bg-[#20B981]/5 px-4 py-3 text-sm text-[#20B981]">{notice}</p> : null}
      {error ? <p role="alert" className="mb-4 rounded-2xl border border-[#E84B65]/30 bg-[#E84B65]/5 px-4 py-3 text-sm text-[#E84B65]">{error}</p> : null}

      {tab === 'posts' ? (
        postsState.status === 'loading' ? (
          <LoadingState label="Loading posts" />
        ) : postsState.status === 'error' ? (
          <ErrorState message={postsState.message} onRetry={postsState.retry} />
        ) : postsState.status === 'denied' ? null : postsState.data.items.length === 0 ? (
          <EmptyState title="No posts to review" body="No community posts have been created yet." />
        ) : (
          <ul className="space-y-4">
            {postsState.data.items.map((item) => (
              <li key={item.id} className="rounded-3xl border border-[#E9DFFF] bg-white/80 p-5 shadow-sm backdrop-blur">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={item.visibility === 'private' ? 'removed' : 'pending'} />
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#77728C]">post</span>
                  <span className="text-xs text-[#77728C]">by {shortId(item.authorId)} · {formatWhen(item.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-[#211B3B]">{item.body}</p>
                {item.visibility !== 'private' ? (
                  <div className="mt-4 flex gap-2">
                    <DangerButton disabled={actingId === item.id} onClick={() => hidePost(item)}>
                      {actingId === item.id ? 'Working…' : 'Hide post'}
                    </DangerButton>
                  </div>
                ) : (
                  <p className="mt-3 text-xs font-semibold text-[#E84B65]">Hidden</p>
                )}
              </li>
            ))}
          </ul>
        )
      ) : state.status === 'loading' ? (
        <LoadingState label="Loading confessions" />
      ) : state.status === 'error' ? (
        <ErrorState message={state.message} onRetry={state.retry} />
      ) : state.status === 'denied' ? null : state.data.items.length === 0 ? (
        <EmptyState title="No confessions to review" body="No confessions have been posted yet." />
      ) : (
        <ul className="space-y-4">
          {state.data.items.map((item) => (
            <li key={item.id} className="rounded-3xl border border-[#E9DFFF] bg-white/80 p-5 shadow-sm backdrop-blur">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={item.status === 'hidden' ? 'removed' : 'pending'} />
                <span className="text-xs font-semibold uppercase tracking-wide text-[#77728C]">confession</span>
                {item.category ? <span className="rounded-full bg-[#E9DFFF] px-2.5 py-0.5 text-xs font-semibold text-[#873BFA]">{item.category}</span> : null}
                <span className="text-xs text-[#77728C]">{formatWhen(item.createdAt)}</span>
              </div>
              <p className="mt-2 text-sm text-[#77728C]">
                {item.isAnonymous ? 'Anonymous confession' : 'Public confession'} · admin record {shortId(item.authorId)}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[#211B3B]">{item.body}</p>
              {item.status !== 'hidden' ? (
                <div className="mt-4 flex gap-2">
                  <DangerButton disabled={actingId === item.id} onClick={() => hideConfession(item)}>
                    {actingId === item.id ? 'Working…' : 'Hide confession'}
                  </DangerButton>
                </div>
              ) : (
                <p className="mt-3 text-xs font-semibold text-[#E84B65]">Hidden</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </AdminLayout>
  );
}
