// /admin — dashboard analytics.
// Uses the REAL endpoints GET /api/admin/stats (counts + user/match/message
// breakdowns) and GET /api/admin/health (email + storage configuration status).
import { AdminLayout, useAdminData } from '../../components/admin/AdminLayout';
import { adminApi, type AdminHealth, type AdminStats } from '../../components/admin/AdminApi';
import { EmptyState, ErrorState, LoadingState, PageHeader, StatCard } from '../../components/admin/AdminUi';

export default function AdminDashboard() {
  const state = useAdminData<AdminStats>(() => adminApi.get<AdminStats>('/api/admin/stats'));
  const health = useAdminData<AdminHealth>(() => adminApi.get<AdminHealth>('/api/admin/health'));

  return (
    <AdminLayout title="Dashboard">
      <PageHeader title="Dashboard" subtitle="Platform overview — users, matches, messages and confessions." />
      {state.status === 'loading' ? (
        <LoadingState label="Loading dashboard statistics" />
      ) : state.status === 'error' ? (
        <ErrorState message={state.message} onRetry={state.retry} />
      ) : state.status === 'denied' ? null : (
        <DashboardContent stats={state.data} health={health.status === 'ok' ? health.data : null} />
      )}
    </AdminLayout>
  );
}

function DashboardContent({ stats, health }: { stats: AdminStats; health: AdminHealth | null }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total users" value={stats.users.toLocaleString()} sub="Registered accounts" />
        <StatCard label="Confessions" value={stats.confessions.toLocaleString()} sub="Anonymous + public" />
        <StatCard label="Total posts" value={stats.posts.toLocaleString()} sub="Community posts" />
        <StatCard
          label="Open reports"
          value={stats.openReports.toLocaleString()}
          sub="Reports awaiting review"
          tone={stats.openReports > 0 ? 'danger' : 'success'}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active users" value={(stats.activeUsers ?? 0).toLocaleString()} sub="Currently active accounts" />
        <StatCard label="Verified users" value={(stats.verifiedUsers ?? 0).toLocaleString()} sub="Email-verified accounts" />
        <StatCard label="Suspended" value={(stats.suspendedUsers ?? 0).toLocaleString()} sub="Temporarily suspended" tone={(stats.suspendedUsers ?? 0) > 0 ? 'danger' : 'success'} />
        <StatCard label="Banned" value={(stats.bannedUsers ?? 0).toLocaleString()} sub="Permanently banned" tone={(stats.bannedUsers ?? 0) > 0 ? 'danger' : 'success'} />
        <StatCard label="Total matches" value={(stats.totalMatches ?? 0).toLocaleString()} sub="Mutual matches created" />
        <StatCard label="Total messages" value={(stats.totalMessages ?? 0).toLocaleString()} sub="Messages sent" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-[#E9DFFF] bg-white/80 p-5 shadow-sm backdrop-blur">
          <h2 className="font-semibold text-[#17142C]">Needs attention</h2>
          {stats.openReports === 0 ? (
            <div className="mt-3">
              <EmptyState title="No open reports" body="Everything reported has been handled." />
            </div>
          ) : (
            <p className="mt-3 text-sm">
              <a href="/admin/reports" className="font-semibold text-[#873BFA] hover:underline">
                {stats.openReports} open report{stats.openReports === 1 ? '' : 's'} to review →
              </a>
            </p>
          )}
          <p className="mt-4 text-xs text-[#77728C]">
            Match % shown across the site is a transparent score from shared interests, location, age proximity and
            intentions — it is not scientifically validated (see docs/API.md).
          </p>
        </section>
        <section className="rounded-3xl border border-[#E9DFFF] bg-white/80 p-5 shadow-sm backdrop-blur">
          <h2 className="font-semibold text-[#17142C]">Email &amp; storage health</h2>
          {health ? (
            <div className="mt-3 space-y-2 text-sm text-[#211B3B]">
              <p>
                Email ({health.email.provider}):{' '}
                <span className="font-semibold">{health.email.configured ? 'Live — key set' : 'Dev mode — no key'}</span>
              </p>
              <p className="text-xs text-[#77728C]">{health.email.note}</p>
              <p>
                Storage: D1 {health.storage.d1 ? 'connected' : 'not bound (local SQLite)'} · R2 bucket{' '}
                <span className="font-mono text-xs">{health.storage.r2Bucket}</span>
              </p>
              <p className="text-xs text-[#77728C]">{health.storage.note}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-[#77728C]">Health status could not be loaded.</p>
          )}
        </section>
      </div>
    </div>
  );
}
