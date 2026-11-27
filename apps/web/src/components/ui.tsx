import { useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle, FlaskConical, Loader2, X } from 'lucide-react'
import { demoMode, onDemoModeChange } from '../lib/api'
import type { User } from '../lib/types'

export function Avatar({ user, size = 40, className = '' }: { user: User; size?: number; className?: string }) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ${className}`}
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${user.avatarColor}, #873BFA)`, fontSize: size * 0.38 }}
      aria-label={user.fullName}
    >
      {user.avatarInitials}
      {user.online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-success" />}
    </span>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

export function LoadingList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="glass p-4"><Skeleton className="h-4 w-2/3 mb-2" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-1/2 mt-2" /></div>
      ))}
    </div>
  )
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="glass p-8 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-lavender/70 text-purple">{icon}</div>
      <h3 className="font-display font-bold text-ink">{title}</h3>
      {body && <p className="mt-1 text-sm text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="glass p-6 text-center" role="alert">
      <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-error" />
      <p className="font-semibold text-ink">Something went wrong</p>
      <p className="mt-1 text-sm text-muted">{message}</p>
      <button className="btn-gradient mt-4" onClick={onRetry}>Try again</button>
    </div>
  )
}

export function DemoBadge() {
  const [, setTick] = useState(0)
  useEffect(() => onDemoModeChange(() => setTick((t) => t + 1)), [])
  if (!demoMode) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-1 text-[11px] font-semibold text-warning" title="The live API is not reachable, so this page is using local demo data.">
      <FlaskConical className="h-3 w-3" /> Demo data
    </span>
  )
}

export function Spinner() { return <Loader2 className="h-4 w-4 animate-spin" /> }

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-navy/40 backdrop-blur-sm p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="glass w-full max-w-lg rounded-b-none sm:rounded-b-3xl p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-lavender/60" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function MatchNote() {
  return <p className="text-[11px] leading-relaxed text-muted">Match % is a compatibility estimate based on shared interests, location and age proximity — it is not scientifically validated.</p>
}
