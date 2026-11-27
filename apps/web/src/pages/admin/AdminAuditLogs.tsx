// /admin/audit-logs — read-only log of admin actions.
// REAL API (apps/worker/src/routes/admin.ts):
//   GET /api/admin/audit-logs -> { items: AuditLogEntry[] } (max 50, newest first)
// Entries carry adminId / action / targetType / targetId / details only —
// no admin display names — so the list shows the admin id shortened.
import { AdminLayout, useAdminData } from '../../components/admin/AdminLayout';
import { adminApi, formatWhen, shortId, type AuditLogEntry } from '../../components/admin/AdminApi';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../../components/admin/AdminUi';

export default function AdminAuditLogs() {
  const state = useAdminData<{ items: AuditLogEntry[] }>(() => adminApi.get<{ items: AuditLogEntry[] }>('/api/admin/audit-logs?limit=50'));

  return (
    <AdminLayout title="Audit Logs">
      <PageHeader title="Audit logs" subtitle="Every admin action — logins, suspensions, moderation decisions and settings changes. Read-only." />
      {state.status === 'loading' ? (
        <LoadingState label="Loading audit logs" />
      ) : state.status === 'error' ? (
        <ErrorState message={state.message} onRetry={state.retry} />
      ) : state.status === 'denied' ? null : state.data.items.length === 0 ? (
        <EmptyState title="No audit entries found" body="No admin actions have been recorded yet." />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-[#E9DFFF] bg-white/80 shadow-sm backdrop-blur">
          <p className="border-b border-[#E9DFFF] px-5 py-3 text-xs font-semibold text-[#77728C]">{state.data.items.length} entr(ies) shown (latest 50)</p>
          <ul className="divide-y divide-[#E9DFFF]">
            {state.data.items.map((e) => (
              <li key={e.id} className="px-5 py-4">
                <p className="text-sm font-semibold text-[#17142C]">
                  {e.adminId ? `Admin ${shortId(e.adminId)}` : 'System'} <span className="font-normal text-[#77728C]">· {e.action}{e.targetType ? ` · ${e.targetType} ${e.targetId ? shortId(e.targetId) : ''}` : ''}</span>
                </p>
                {e.details ? <p className="mt-0.5 text-sm text-[#77728C]">{e.details}</p> : null}
                <p className="mt-0.5 text-xs text-[#77728C]">{formatWhen(e.createdAt)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AdminLayout>
  );
}
