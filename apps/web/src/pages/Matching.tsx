import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, MapPin, Sparkles, Star, X } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { EmptyState, ErrorState, LoadingList, MatchNote, Spinner } from '../components/ui'

export default function Matching() {
  const qc = useQueryClient()
  const [index, setIndex] = useState(0)
  const [notice, setNotice] = useState('')
  const discover = useQuery({ queryKey: ['discover'], queryFn: () => api.discover() })
  const people = discover.data || []
  const person = people[index]
  const act = useMutation({
    mutationFn: async (kind: 'like' | 'pass' | 'super') => {
      if (!person) return
      if (kind === 'like') return api.like(person.id)
      if (kind === 'pass') return api.pass(person.id)
      return api.superLike(person.id)
    },
    onSuccess: (res, kind) => {
      if (kind === 'like' && res && typeof res === 'object' && 'matched' in res && res.matched) setNotice(`It's a match with ${person?.fullName}! You can now message each other.`)
      else if (kind === 'super') setNotice(`Super Like sent to ${person?.fullName}.`)
      else setNotice('')
      setIndex((i) => i + 1)
      qc.invalidateQueries({ queryKey: ['discover'] })
      qc.invalidateQueries({ queryKey: ['matches'] })
    },
  })
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">Matching</h1>
        <p className="text-sm text-muted">Matching is one part of Crush and Confo — explore confessions, community and messages too.</p>
        <MatchNote />
      </div>
      {notice && <div className="glass border-success/40 bg-success/10 p-4 text-sm font-semibold text-success" role="status">{notice} <Link to="/messages" className="underline">Open Messages</Link></div>}
      {discover.isLoading ? <LoadingList /> : discover.isError ? <ErrorState message="Could not load people." onRetry={() => discover.refetch()} /> : !person ? (
        <EmptyState icon={<Heart className="h-6 w-6" />} title="You've seen everyone for now" body="New people join every day — check back soon, or explore the community." action={<Link to="/explore" className="btn-gradient">Explore community</Link>} />
      ) : (
        <article className="glass overflow-hidden" aria-label={`Profile of ${person.fullName}`}>
          <div className="relative h-80 sm:h-96" style={{ background: `linear-gradient(160deg, ${person.avatarColor}, #873BFA)` }}>
            <div className="absolute inset-0 flex items-center justify-center"><span className="text-8xl font-extrabold text-white/90">{person.avatarInitials}</span></div>
            <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-pink">{person.matchPercent}% Match</span>
            {person.online && <span className="absolute right-4 top-4 rounded-full bg-success px-3 py-1 text-xs font-bold text-white">Online now</span>}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/85 to-transparent p-5 pt-16 text-white">
              <h2 className="font-display text-3xl font-extrabold">{person.fullName}, {person.age}</h2>
              <p className="flex items-center gap-1 text-sm text-white/85"><MapPin className="h-4 w-4" /> {person.city}, {person.country}{person.distanceKm ? ` · ${person.distanceKm} km away` : ''}</p>
            </div>
          </div>
          <div className="p-5">
            <p className="text-[15px] leading-relaxed text-ink/90">{person.bio}</p>
            <div className="mt-3 flex flex-wrap gap-2">{person.interests.map((i) => <span key={i} className="chip">{i}</span>)}</div>
            <div className="mt-5 flex items-center justify-center gap-3 sm:gap-4">
              <button onClick={() => act.mutate('pass')} disabled={act.isPending} className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-glass ring-1 ring-lavender transition hover:scale-105" aria-label={`Pass on ${person.fullName}`}><X className="h-6 w-6 text-error" /></button>
              <button onClick={() => act.mutate('super')} disabled={act.isPending} className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-warning to-pink text-white shadow-lg transition hover:scale-105" aria-label={`Super Like ${person.fullName}`}><Star className="h-7 w-7 fill-white" /></button>
              <button onClick={() => act.mutate('like')} disabled={act.isPending} className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-pink to-purple text-white shadow-lg transition hover:scale-105" aria-label={`Like ${person.fullName}`}>{act.isPending ? <Spinner /> : <Heart className="h-6 w-6 fill-white" />}</button>
            </div>
            <p className="mt-3 text-center text-xs text-muted">Pass · Super Like · Like — a mutual Like creates a match. Chat only opens after a mutual match.</p>
            <div className="mt-4 flex justify-center gap-3">
              <Link to={`/profile/${person.username}`} className="btn-ghost">View full profile</Link>
              <Link to="/matching-preferences" className="btn-ghost"><Sparkles className="h-4 w-4" /> Matching preferences</Link>
            </div>
          </div>
        </article>
      )}
      <div>
        <h2 className="mb-3 font-display text-lg font-bold text-ink">More people</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {people.slice(index + 1, index + 7).map((u) => (
            <Link key={u.id} to={`/profile/${u.username}`} className="glass overflow-hidden p-0 hover:shadow-glass">
              <span className="block h-28" style={{ background: `linear-gradient(160deg, ${u.avatarColor}, #873BFA)` }}><span className="flex h-full items-center justify-center text-3xl font-extrabold text-white">{u.avatarInitials}</span></span>
              <span className="block p-3"><span className="block truncate font-semibold text-ink">{u.fullName}, {u.age}</span><span className="text-xs text-muted">{u.city} · {u.matchPercent}% Match</span></span>
            </Link>
          ))}
        </div>
      </div>
      <div className="glass p-4 text-center text-sm text-muted">Looking for someone specific? <Link className="font-semibold text-purple" to="/explore">Search the community</Link> or see <Link className="font-semibold text-purple" to="/my-matches">your matches</Link>.</div>
    </div>
  )
}
