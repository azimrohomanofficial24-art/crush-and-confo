// /admin/users — list, view, suspend / reactivate / ban.
// REAL API (apps/worker/src/routes/admin.ts):
//   GET  /api/admin/users?search=&status=&limit=  -> { items: safeUser[] } (server-side search + filter)
//   POST /api/admin/users/:id/suspend             -> { suspended: true }
//   POST /api/admin/users/:id/reactivate          -> { reactivated: true }
//   POST /api/admin/users/:id/ban                 -> { banned: true }
// Every status change is audit-logged server-side.
import { useEffect, useState } from 'react';
import { AdminLayout, useAdminData } from '../../components/admin/AdminLayout';
import { adminApi, ageFromDob, formatDate, type AdminUser } from '../../components/admin/AdminApi';
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

export default function AdminUsers() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Debounce the search box so the server is only queried after the user pauses typing.
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => window.clearTimeout(t);
  }, [query]);

  const state = useAdminData<{ items: AdminUser[] }>(
    () =>
      adminApi.get<{ items: AdminUser[] }>(
        `/api/admin/users?limit=50&status=${encodeURIComponent(statusFilter)}&search=${encodeURIComponent(debouncedQuery)}`,
      ),
    [debouncedQuery, statusFilter, refreshKey],
  );
  const users = state.status === 'ok' ? state.data.items : [];

  async function changeStatus(user: AdminUser, action: 'suspend' | 'reactivate' | 'ban') {
    if (
      !window.confirm(
        action === 'reactivate'
          ? `Reactivate @${user.username}? Their account returns to active.`
          : action === 'ban'
            ? `Ban @${user.username}? This is permanent until an admin reactivates them. This is recorded in the audit log.`
            : `Suspend @${user.username}? They will not be able to use the site until reactivated. This is recorded in the audit log.`,
      )
    ) {
      return;
    }
    setActionError(null);
    setActing(true);
    try {
      await adminApi.post(`/api/admin/users/${user.id}/${action}`);
      setSelected(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'That action failed. Please try again.');
    } finally {
      setActing(false);
    }
  }

  return (
    <AdminLayout title="Users">
      <PageHeader title="Users" subtitle="Search, inspect and moderate user accounts. Every status change is written to the audit log." />
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, username or email…"
          aria-label="Search users"
          className="min-w-0 flex-1 rounded-full border border-[#E9DFFF] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#873BFA] focus:ring-2 focus:ring-[#873BFA]/20"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className="rounded-full border border-[#E9DFFF] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#873BFA]"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
        </select>
      </div>
      <p className="mb-4 text-xs text-[#77728C]">
        Search and status filtering run on the server (name, username or email). Showing the latest 50 matching users.
      </p>

      {actionError ? (
        <p role="alert" className="mb-4 rounded-2xl border border-[#E84B65]/30 bg-[#E84B65]/5 px-4 py-3 text-sm text-[#E84B65]">{actionError}</p>
      ) : null}

      {state.status === 'loading' ? (
        <LoadingState label="Loading users" />
      ) : state.status === 'error' ? (
        <ErrorState message={state.message} onRetry={state.retry} />
      ) : state.status === 'denied' ? null : users.length === 0 ? (
        <EmptyState
          title="No users found"
          body={query || statusFilter !== 'all' ? 'Try a different search or clear the status filter.' : 'No users have registered yet.'}
          action={query || statusFilter !== 'all' ? <SecondaryButton onClick={() => { setQuery(''); setStatusFilter('all'); }}>Clear filters</SecondaryButton> : undefined}
        />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-[#E9DFFF] bg-white/80 shadow-sm backdrop-blur">
          <p className="border-b border-[#E9DFFF] px-5 py-3 text-xs font-semibold text-[#77728C]">{users.length} user(s) shown</p>
          <ul className="divide-y divide-[#E9DFFF]">
            {users.map((u) => {
              const age = ageFromDob(u.dateOfBirth);
              return (
                <li key={u.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-[#17142C]">{u.displayName} <span className="font-normal text-[#77728C]">@{u.username}</span></p>
                    <p className="truncate text-xs text-[#77728C]">{u.email}{u.location ? ` · ${u.location}` : ''}{age !== null ? ` · ${age}` : ''}</p>
                  </div>
                  <StatusBadge status={u.status} />
                  {u.emailVerified ? <StatusBadge status="verified" /> : null}
                  <SecondaryButton onClick={() => setSelected(u)}>View</SecondaryButton>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#17142C]/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={`User ${selected.username}`}>
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-[#17142C]">{selected.displayName} <span className="font-normal text-[#77728C]">@{selected.username}</span></h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-[#77728C]">Email</dt><dd className="break-all font-medium">{selected.email}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#77728C]">Status</dt><dd><StatusBadge status={selected.status} /></dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#77728C]">Verified</dt><dd className="font-medium">{selected.emailVerified ? 'Yes' : 'No'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#77728C]">Age</dt><dd className="font-medium">{ageFromDob(selected.dateOfBirth) ?? 'Unknown'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#77728C]">Location</dt><dd className="font-medium">{selected.location ?? '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#77728C]">Joined</dt><dd className="font-medium">{formatDate(selected.createdAt)}</dd></div>
            </dl>
            <div className="mt-6 flex flex-wrap gap-2">
              {selected.status === 'suspended' || selected.status === 'banned' ? (
                <PrimaryButton disabled={acting} onClick={() => changeStatus(selected, 'reactivate')}>Reactivate account</PrimaryButton>
              ) : (
                <>
                  <DangerButton disabled={acting} onClick={() => changeStatus(selected, 'suspend')}>Suspend</DangerButton>
                  <DangerButton disabled={acting} onClick={() => changeStatus(selected, 'ban')}>Ban permanently</DangerButton>
                </>
              )}
              <SecondaryButton onClick={() => setSelected(null)}>Close</SecondaryButton>
            </div>
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
}
