// Shared admin UI primitives — White Glass design tokens from CONTRACT.md.
// bg #F7F5FF, surface #FFFFFF, pink #F52D91, purple #873BFA, lavender #E9DFFF,
// navy #17142C, text #211B3B, muted #77728C, success #20B981, warning #F5A623, error #E84B65.
// Self-contained: no imports from outside the admin folders.
import type { ReactNode } from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-2xl bg-[#E9DFFF]/60 ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-3xl border border-[#E9DFFF] bg-white/80 p-5 shadow-sm backdrop-blur">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-8 w-16" />
      <Skeleton className="mt-2 h-3 w-32" />
    </div>
  );
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-4">
      <p className="sr-only">{label}</p>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#E9DFFF] bg-white/70 px-6 py-14 text-center">
      <p className="text-base font-semibold text-[#211B3B]">{title}</p>
      {body ? <p className="mt-1 max-w-md text-sm text-[#77728C]">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-3xl border border-[#E84B65]/30 bg-[#E84B65]/5 px-6 py-8 text-center">
      <p className="text-base font-semibold text-[#211B3B]">Something went wrong</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-[#77728C]">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-full bg-gradient-to-r from-[#F52D91] to-[#873BFA] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#873BFA]"
      >
        Try again
      </button>
    </div>
  );
}

export function StatCard({ label, value, sub, tone = 'default' }: { label: string; value: string | number; sub?: string; tone?: 'default' | 'danger' | 'success' }) {
  const valueColor = tone === 'danger' ? 'text-[#E84B65]' : tone === 'success' ? 'text-[#20B981]' : 'text-[#17142C]';
  return (
    <div className="rounded-3xl border border-[#E9DFFF] bg-white/80 p-5 shadow-sm backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#77728C]">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${valueColor}`}>{value}</p>
      {sub ? <p className="mt-1 text-xs text-[#77728C]">{sub}</p> : null}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-[#20B981]/10 text-[#20B981]',
    verified: 'bg-[#20B981]/10 text-[#20B981]',
    approved: 'bg-[#20B981]/10 text-[#20B981]',
    resolved: 'bg-[#20B981]/10 text-[#20B981]',
    pending: 'bg-[#F5A623]/10 text-[#B97A06]',
    open: 'bg-[#F5A623]/10 text-[#B97A06]',
    reviewing: 'bg-[#873BFA]/10 text-[#873BFA]',
    suspended: 'bg-[#E84B65]/10 text-[#E84B65]',
    banned: 'bg-[#E84B65]/10 text-[#E84B65]',
    removed: 'bg-[#E84B65]/10 text-[#E84B65]',
    dismissed: 'bg-[#77728C]/10 text-[#77728C]',
    pending_verification: 'bg-[#F5A623]/10 text-[#B97A06]',
  };
  const cls = map[status] ?? 'bg-[#77728C]/10 text-[#77728C]';
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{status.replaceAll('_', ' ')}</span>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-[#17142C]">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-[#77728C]">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-full bg-gradient-to-r from-[#F52D91] to-[#873BFA] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#873BFA] disabled:cursor-not-allowed disabled:opacity-50 ${props.className ?? ''}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-full border border-[#E9DFFF] bg-white px-4 py-2 text-sm font-semibold text-[#211B3B] shadow-sm transition hover:bg-[#F7F5FF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#873BFA] disabled:cursor-not-allowed disabled:opacity-50 ${props.className ?? ''}`}
    >
      {children}
    </button>
  );
}

export function DangerButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-full bg-[#E84B65] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E84B65] disabled:cursor-not-allowed disabled:opacity-50 ${props.className ?? ''}`}
    >
      {children}
    </button>
  );
}
