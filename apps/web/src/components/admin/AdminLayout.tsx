// Admin layout + auth guard — Crush and Confo admin.
// Self-contained (no imports from outside the admin folders). Agent A wires these
// pages into the main React Router; see pages/admin/index.ts for the route table.
//
// Auth rule (CONTRACT.md): admin pages NEVER render admin data on 401/403.
// useAdminGuard checks /api/admin/me on mount; on AdminAuthError it redirects to
// /admin/login with ?next=... and a clear message. Pages using useAdminData get
// the same behaviour for every data fetch.
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Flag,
  LayoutDashboard,
  LogOut,
  Megaphone,
  ScrollText,
  Settings,
  Shield,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { AdminApiError, AdminAuthError, adminApi } from './AdminApi';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/moderation', label: 'Moderation', icon: Shield },
  { to: '/admin/reports', label: 'Reports', icon: Flag },
  { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
];

export function redirectToAdminLogin(navigate: (to: string) => void, next: string, reason?: string) {
  const params = new URLSearchParams({ next });
  if (reason) params.set('reason', reason);
  navigate(`/admin/login?${params.toString()}`);
}

/** Guard hook: verifies the admin session before any admin data renders. */
export function useAdminGuard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState<'checking' | 'ok' | 'denied'>('checking');
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    adminApi
      .me()
      .then((data) => {
        if (!alive) return;
        setAdminEmail(data.admin.email);
        setState('ok');
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setState('denied');
        if (err instanceof AdminAuthError) {
          redirectToAdminLogin(
            (to) => navigate(to, { replace: true }),
            location.pathname,
            err.status === 401 ? 'Your admin session expired. Please sign in again.' : 'Admin access is required for this page.',
          );
        }
      });
    return () => {
      alive = false;
    };
  }, [navigate, location.pathname]);

  return { state, adminEmail };
}

export type AdminDataState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string; retry: () => void }
  | { status: 'denied' }
  | { status: 'ok'; data: T };

/** Data-fetch hook with loading / error-with-retry / 401-403-denied states. */
export function useAdminData<T>(fetcher: () => Promise<T>, deps: unknown[] = []): AdminDataState<T> {
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState<AdminDataState<T>>({ status: 'loading' });
  const load = useCallback(() => {
    setState({ status: 'loading' });
    fetcher()
      .then((data) => setState({ status: 'ok', data }))
      .catch((err: unknown) => {
        if (err instanceof AdminAuthError) {
          setState({ status: 'denied' });
          redirectToAdminLogin(
            (to) => navigate(to, { replace: true }),
            location.pathname,
            err.status === 401 ? 'Your admin session expired. Please sign in again.' : 'Admin access is required for this page.',
          );
          return;
        }
        setState({
          status: 'error',
          message: err instanceof AdminApiError ? err.message : 'Something went wrong while loading this page.',
          retry: () => load(),
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return state;
}

export function AdminLayout({ children, title }: { children: ReactNode; title?: string }) {
  const navigate = useNavigate();
  const guard = useAdminGuard();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await adminApi.logout();
    } catch {
      // Even if the server call fails, drop the local session view.
    }
    navigate('/admin/login', { replace: true });
  }

  if (guard.state === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F5FF]" role="status" aria-live="polite">
        <p className="text-sm text-[#77728C]">Checking admin session…</p>
      </div>
    );
  }
  if (guard.state === 'denied') return null; // redirect is already in flight

  return (
    <div className="min-h-screen bg-[#F7F5FF] text-[#211B3B]">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-[#E9DFFF] bg-white/80 p-5 backdrop-blur md:flex">
          <Link to="/admin" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-r from-[#F52D91] to-[#873BFA] text-white">
              <ShieldCheck size={20} />
            </span>
            <span className="text-lg font-bold text-[#17142C]">
              Crush <span className="text-[#F52D91]">&amp;</span> Confo
            </span>
          </Link>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#77728C]">Admin console</p>
          <nav className="mt-6 flex flex-col gap-1" aria-label="Admin">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive ? 'bg-[#E9DFFF] text-[#17142C]' : 'text-[#77728C] hover:bg-[#F7F5FF] hover:text-[#211B3B]'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto rounded-2xl border border-[#E9DFFF] bg-[#F7F5FF] p-3">
            <p className="flex items-center gap-2 text-xs font-semibold text-[#211B3B]">
              <BarChart3 size={14} /> Signed in as admin
            </p>
            <p className="mt-1 break-all text-xs text-[#77728C]">{guard.adminEmail ?? 'admin'}</p>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="mt-3 flex items-center gap-2 rounded-full border border-[#E9DFFF] bg-white px-3 py-1.5 text-xs font-semibold text-[#211B3B] hover:bg-[#F7F5FF] disabled:opacity-50"
            >
              <LogOut size={14} /> {loggingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#E9DFFF] bg-[#F7F5FF]/90 px-4 py-3 backdrop-blur md:px-8">
            <p className="truncate text-sm font-semibold text-[#17142C]">{title ?? 'Admin'}</p>
            <nav className="flex gap-1 overflow-x-auto md:hidden" aria-label="Admin (mobile)">
              {NAV.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/admin'}
                  className={({ isActive }) =>
                    `whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${isActive ? 'bg-[#E9DFFF] text-[#17142C]' : 'text-[#77728C]'}`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
            <Link to="/" className="hidden shrink-0 text-xs font-semibold text-[#873BFA] hover:underline sm:block">
              View public site
            </Link>
          </header>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
