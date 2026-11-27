import { Link } from 'react-router-dom'
import { Heart, MapPin, Star, X } from 'lucide-react'
import type { User } from '../lib/types'

/** Photo-led Discover card: the real user photo fills the card. If the user
 *  has not uploaded a photo, an elegant gradient-initial tile is shown —
 *  never a stock or demo photo of a fake person. */
export function DiscoverPhoto({ user, className = '' }: { user: User; className?: string }) {
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={`${user.fullName}'s photo`}
        loading="lazy"
        className={`h-full w-full object-cover ${className}`}
      />
    )
  }
  return (
    <span
      className={`flex h-full w-full items-center justify-center ${className}`}
      style={{ background: `linear-gradient(160deg, ${user.avatarColor}, #873BFA)` }}
      aria-label={`${user.fullName} has no photo yet`}
    >
      <span className="text-6xl font-extrabold text-white/95">{user.avatarInitials}</span>
    </span>
  )
}

export function DiscoverCard({
  user, onLike, onPass, onSuperLike, pending,
}: {
  user: User
  onLike?: (id: string) => void
  onPass?: (id: string) => void
  onSuperLike?: (id: string) => void
  pending?: boolean
}) {
  return (
    <article className="glass overflow-hidden" aria-label={`Profile of ${user.fullName}`}>
      <Link to={`/profile/${user.username}`} className="relative block aspect-[3/4] w-full overflow-hidden">
        <DiscoverPhoto user={user} />
        {/* Real Like button (was a decorative span: it looked like a Like
            control but did nothing except navigate to the profile). Only
            shown when a like handler exists. */}
        {onLike && (
          <button
            type="button"
            disabled={pending}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onLike(user.id) }}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-glass ring-1 ring-pink/30 transition hover:scale-110 disabled:opacity-50"
            aria-label={`Like ${user.fullName}`}
          >
            <Heart className="h-5 w-5 fill-pink text-pink" />
          </button>
        )}
        {user.matchPercent != null && (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-pink shadow-soft">{user.matchPercent}% Match</span>
        )}
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/90 via-navy/40 to-transparent px-4 pb-4 pt-14 text-white">
          <span className="block font-display text-xl font-extrabold leading-tight">{user.fullName}{user.age != null ? `, ${user.age}` : ''}</span>
          <span className="mt-0.5 flex items-center gap-1 text-sm text-white/90">
            <MapPin className="h-3.5 w-3.5 shrink-0" /> {user.city || 'Bangladesh'}{user.country ? `, ${user.country}` : ''}
          </span>
          {user.bio && <span className="mt-1 block truncate text-sm text-white/80">{user.bio}</span>}
        </span>
      </Link>
      <div className="p-4">
        {user.interests.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {user.interests.slice(0, 3).map((i) => <span key={i} className="chip">{i}</span>)}
          </div>
        )}
        <div className="mt-3 flex items-center justify-center gap-4">
          {onPass && (
            <span className="flex flex-col items-center gap-1">
              <button onClick={() => onPass(user.id)} disabled={pending} className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-glass ring-1 ring-lavender transition hover:scale-105 disabled:opacity-50" aria-label={`Pass on ${user.fullName}`}>
                <X className="h-5 w-5 text-error" />
              </button>
              <span className="text-[11px] font-semibold text-muted">Pass</span>
            </span>
          )}
          {onSuperLike && (
            <span className="flex flex-col items-center gap-1">
              <button onClick={() => onSuperLike(user.id)} disabled={pending} className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-warning to-pink text-white shadow-lg transition hover:scale-105 disabled:opacity-50" aria-label={`Super Like ${user.fullName}`}>
                <Star className="h-6 w-6 fill-white" />
              </button>
              <span className="text-[11px] font-semibold text-muted">Super Like</span>
            </span>
          )}
          {onLike && (
            <span className="flex flex-col items-center gap-1">
              <button onClick={() => onLike(user.id)} disabled={pending} className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-pink to-purple text-white shadow-lg transition hover:scale-105 disabled:opacity-50" aria-label={`Like ${user.fullName}`}>
                <Heart className="h-5 w-5 fill-white" />
              </button>
              <span className="text-[11px] font-semibold text-muted">Like</span>
            </span>
          )}
          {!onLike && !onPass && (
            <Link to={`/profile/${user.username}`} className="btn-gradient w-full">View profile</Link>
          )}
        </div>
      </div>
    </article>
  )
}
