import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Sparkles } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { EmptyState, ErrorState, LoadingList, MatchNote, Spinner } from '../components/ui'
import { DiscoverCard, DiscoverPhoto } from '../components/DiscoverCard'

export default function Matching() {
  const qc = useQueryClient()
  const [index, setIndex] = useState(0)
  const [notice, setNotice] = useState('')
  const discover = useQuery({ queryKey: ['discover'], queryFn: () => api.discover() })
  const people = discover.data || []
  const person = people[index]
  const act = useMutation({
    mutationFn: async (kind: 'like' | 'pass' | 'super') => {
      if (!person) return null
      if (kind === 'like') return api.like(person.id)
      if (kind === 'pass') { await api.pass(person.id); return null }
      return api.superLike(person.id)
    },
    onSuccess: (res, kind) => {
      if (kind === 'like' && res?.matched) setNotice(`It's a match with ${person?.fullName}! You can now message each other.`)
      else if (kind === 'super') setNotice(res?.matched ? `It's a match with ${person?.fullName}! You can now message each other.` : `Super Like sent to ${person?.fullName}.`)
      else setNotice('')
      setIndex((i) => i + 1)
      qc.invalidateQueries({ queryKey: ['discover'] })
      qc.invalidateQueries({ queryKey: ['matches'] })
    },
  })
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">Discover</h1>
        <p className="text-sm text-muted">Matching is one part of Crush and Confo — explore confessions, community and messages too. Photos are real user photos; people without a photo show a gradient placeholder.</p>
        <MatchNote />
      </div>
      {notice && <div className="glass border-success/40 bg-success/10 p-4 text-sm font-semibold text-success" role="status">{notice} <Link to="/messages" className="underline">Open Messages</Link></div>}
      {discover.isLoading ? <LoadingList /> : discover.isError ? <ErrorState message="Could not load people." onRetry={() => discover.refetch()} /> : !person ? (
        <EmptyState icon={<Heart className="h-6 w-6" />} title="You've seen everyone for now" body="New people join every day — check back soon, or explore the community." action={<Link to="/explore" className="btn-gradient">Explore community</Link>} />
      ) : (
        <article className="glass overflow-hidden" aria-label={`Profile of ${person.fullName}`}>
          <div className="relative aspect-[4/5] w-full overflow-hidden sm:aspect-[4/3]">
            <DiscoverPhoto user={person} />
            {person.matchPercent != null && (
              <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-pink shadow-soft">{person.matchPercent}% Match</span>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/90 via-navy/40 to-transparent p-5 pt-16 text-white">
              <h2 className="font-display text-3xl font-extrabold">{person.fullName}{person.age != null ? `, ${person.age}` : ''}</h2>
              <p className="mt-1 text-sm text-white/90">{person.city || 'Bangladesh'}{person.country ? `, ${person.country}` : ''}</p>
            </div>
          </div>
          <div className="p-5">
            <p className="text-[15px] leading-relaxed text-ink/90">{person.bio || 'No bio yet.'}</p>
            <div className="mt-3 flex flex-wrap gap-2">{person.interests.map((i) => <span key={i} className="chip">{i}</span>)}</div>
            <div className="mt-6 flex items-start justify-center gap-6">
              <span className="flex flex-col items-center gap-1.5">
                <button onClick={() => act.mutate('pass')} disabled={act.isPending} className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-glass ring-1 ring-lavender transition hover:scale-105 disabled:opacity-50" aria-label={`Pass on ${person.fullName}`}>
                  <span className="text-2xl font-bold leading-none text-error">×</span>
                </button>
                <span className="text-xs font-semibold text-muted">Pass</span>
              </span>
              <span className="flex flex-col items-center gap-1.5">
                <button onClick={() => act.mutate('super')} disabled={act.isPending} className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-warning to-pink text-white shadow-lg transition hover:scale-105 disabled:opacity-50" aria-label={`Super Like ${person.fullName}`}>
                  <Sparkles className="h-7 w-7 fill-white" />
                </button>
                <span className="text-xs font-semibold text-muted">Super Like</span>
              </span>
              <span className="flex flex-col items-center gap-1.5">
                <button onClick={() => act.mutate('like')} disabled={act.isPending} className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-pink to-purple text-white shadow-lg transition hover:scale-105 disabled:opacity-50" aria-label={`Like ${person.fullName}`}>
                  {act.isPending ? <Spinner /> : <Heart className="h-6 w-6 fill-white" />}
                </button>
                <span className="text-xs font-semibold text-muted">Like</span>
              </span>
            </div>
            <p className="mt-4 text-center text-xs text-muted">A mutual Like creates a match. Chat only opens after a mutual match.</p>
            <div className="mt-4 flex justify-center gap-3">
              <Link to={`/profile/${person.username}`} className="btn-ghost">View full profile</Link>
              <Link to="/matching-preferences" className="btn-ghost"><Sparkles className="h-4 w-4" /> Matching preferences</Link>
            </div>
          </div>
        </article>
      )}
      <div>
        <h2 className="mb-3 font-display text-lg font-bold text-ink">More people</h2>
        {people.length <= 1 ? (
          <p className="text-sm text-muted">No more people to show right now.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {people.slice(index + 1, index + 7).map((u) => (
              <Link key={u.id} to={`/profile/${u.username}`} className="glass overflow-hidden p-0 hover:shadow-glass">
                <span className="relative block aspect-[3/4] w-full"><DiscoverPhoto user={u} />
                  {u.matchPercent != null && <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-bold text-pink">{u.matchPercent}%</span>}
                </span>
                <span className="block p-3"><span className="block truncate font-semibold text-ink">{u.fullName}{u.age != null ? `, ${u.age}` : ''}</span><span className="text-xs text-muted">{u.city || 'Bangladesh'}</span></span>
              </Link>
            ))}
          </div>
        )}
      </div>
      <div className="glass p-4 text-center text-sm text-muted">Looking for someone specific? <Link className="font-semibold text-purple" to="/explore">Search the community</Link> or see <Link className="font-semibold text-purple" to="/my-matches">your matches</Link>.</div>
    </div>
  )
}
