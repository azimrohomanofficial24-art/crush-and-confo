// /admin/login — separate admin login. There is NO public admin registration:
// admin accounts are created only via `npm run seed:admin` (Agent B's seed script).
// On 401 the page shows the server message; it never renders admin data.
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { AdminApiError, adminApi } from '../../components/admin/AdminApi';

export default function AdminLogin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(searchParams.get('reason'));
  const [busy, setBusy] = useState(false);
  const next = searchParams.get('next') ?? '/admin';

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await adminApi.login(email.trim(), password);
      navigate(next.startsWith('/admin') ? next : '/admin', { replace: true });
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F5FF] px-4 text-[#211B3B]">
      <div className="w-full max-w-md rounded-3xl border border-[#E9DFFF] bg-white/85 p-8 shadow-sm backdrop-blur">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-[#F52D91] to-[#873BFA] text-white">
          <ShieldCheck size={24} />
        </span>
        <h1 className="mt-4 text-2xl font-bold text-[#17142C]">Admin sign in</h1>
        <p className="mt-1 text-sm text-[#77728C]">
          Crush and Confo admin console. Admin accounts are created by the site owner only — there is no public
          admin registration.
        </p>
        {error ? (
          <p role="alert" className="mt-4 rounded-2xl border border-[#E84B65]/30 bg-[#E84B65]/5 px-4 py-3 text-sm text-[#E84B65]">
            {error}
          </p>
        ) : null}
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold">Admin email</span>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="mt-1 w-full rounded-2xl border border-[#E9DFFF] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#873BFA] focus:ring-2 focus:ring-[#873BFA]/20"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-2xl border border-[#E9DFFF] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#873BFA] focus:ring-2 focus:ring-[#873BFA]/20"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-gradient-to-r from-[#F52D91] to-[#873BFA] py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#873BFA] disabled:opacity-50"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-5 text-center text-xs text-[#77728C]">
          Not an admin? <Link to="/" className="font-semibold text-[#873BFA] hover:underline">Go to the public site</Link>
        </p>
      </div>
    </div>
  );
}
