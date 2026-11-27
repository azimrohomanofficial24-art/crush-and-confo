// /admin/reports — review and resolve user reports.
// REAL API (apps/worker/src/routes/admin.ts):
//   GET  /api/admin/reports?status=open    -> { items: AdminReport[] } (status filter supported)
//   POST /api/admin/reports/:id/resolve    -> body { status: 'resolved' | 'dismissed' }
// Reports carry reporterId / targetType / targetId only — no display names — so
// the list shows the target type + a shortened id. Resolving writes an audit log.
import { useState } from 'react';
import { AdminLayout, useAdminData } from '../../components/admin/AdminLayout';
import { adminApi, formatWhen, shortId, type AdminReport } from '../../components/admin/AdminApi';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
} from '../../components/admin/AdminUi';

export default function AdminReports() {
  const [statusFilter, setStatusFilter] = useState('open');
  const [selected, setSelected] = useState<AdminReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const state = useAdminData<{ items: AdminReport[] }>(() => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    const qs = params.toString();
    return adminApi.get<{ items: AdminReport[] }>(`/api/admin/reports${qs ? `?${qs}` : ''}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, refreshKey]);

  async function resolve(report: AdminReport, outcome: 'resolved' | 'dismissed') {
    setError(null);
    setActing(true);
    try {
      await adminApi.post(`/api/admin/reports/${report.id}/resolve`, { status: outcome });
      setSelected(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That action failed. Please try again.');
    } finally {
      setActing(false);
    }
  }

  return (
    <AdminLayout title="Reports">
      <PageHeader title="Reports" subtitle="User reports against people, posts, confessions and messages. Resolve or dismiss each one — the decision is audit-logged." />
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {(['open', 'resolved', 'dismissed', 'all'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            aria-pressed={statusFilter === s}
            className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${statusFilter === s ? 'bg-[#17142C] text-white' : 'border border-[#E9DFFF] bg-white text-[#211B3B]'}`}
          >
            {s}
          </button>
        ))}
      </div>
      {error ? <p role="alert" className="mb-4 rounded-2xl border border-[#E84B65]/30 bg-[#E84B65]/5 px-4 py-3 text-sm text-[#E84B65]">{error}</p> : null}

      {state.status === 'loading' ? (
        <LoadingState label="Loading reports" />
      ) : state.status === 'error' ? (
        <ErrorState message={state.message} onRetry={state.retry} />
      ) : state.status === 'denied' ? null : state.data.items.length === 0 ? (
        <EmptyState title="No reports here" body={statusFilter === 'open' ? 'No open reports. Everything reported has been handled.' : 'No reports match this filter.'} />
      ) : (
        <ul className="space-y-3">
          {state.data.items.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-3xl border border-[#E9DFFF] bg-white/80 px-5 py-4 shadow-sm backdrop-blur">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-[#17142C]">{r.targetType} {shortId(r.targetId)} <span className="font-normal text-[#77728C]">· reported by {shortId(r.reporterId)}</span></p>
                <p className="truncate text-sm text-[#77728C]">{r.reason}{r.details ? ` — ${r.details}` : ''}</p>
                <p className="text-xs text-[#77728C]">{formatWhen(r.createdAt)}</p>
              </div>
              <StatusBadge status={r.status} />
              <SecondaryButton onClick={() => setSelected(r)}>Review</SecondaryButton>
            </li>
          ))}
        </ul>
      )}

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#17142C]/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Review report">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-[#17142C]">Report — {selected.targetType} {shortId(selected.targetId)}</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-[#77728C]">Target</dt><dd className="font-medium">{selected.targetType}: {selected.targetId}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#77728C]">Reporter</dt><dd className="font-medium">{selected.reporterId}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#77728C]">Reason</dt><dd className="font-medium">{selected.reason}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#77728C]">Status</dt><dd><StatusBadge status={selected.status} /></dd></div>
            </dl>
            {selected.details ? <p className="mt-3 rounded-2xl bg-[#F7F5FF] p-3 text-sm text-[#211B3B]">{selected.details}</p> : null}
            <div className="mt-6 flex flex-wrap gap-2">
              <PrimaryButton disabled={acting} onClick={() => resolve(selected, 'resolved')}>Mark resolved</PrimaryButton>
              <SecondaryButton disabled={acting} onClick={() => resolve(selected, 'dismissed')}>Dismiss</SecondaryButton>
              <SecondaryButton onClick={() => setSelected(null)}>Close</SecondaryButton>
            </div>
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
}
