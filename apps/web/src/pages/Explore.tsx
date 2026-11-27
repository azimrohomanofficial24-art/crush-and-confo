import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Compass, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { trendingTopics } from '../lib/demoData'
import { Avatar, EmptyState, LoadingList } from '../components/ui'
import { ConfessionCard, FollowButton, PostCard } from '../components/feed'

export default function Explore() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const [input, setInput] = useState(q)
  const search = useQuery({ queryKey: ['search', q], queryFn: () => api.search(q), enabled: q.length > 0 })
  const discover = useQuery({ queryKey: ['discover'], queryFn: () => api.discover() })
  const submit = (e: React.FormEvent) => { e.preventDefault(); setParams(input.trim() ? { q: input.trim() } : {}) }
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">Explore</h1>
        <p className="text-sm text-muted">Discover people, posts, confessions and trending topics.</p>
      </div>
      <form onSubmit={submit} className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search people, posts, or confessions…" className="input !rounded-full pl-11" aria-label="Search" />
      </form>
      {q ? (
        <div className="space-y-5">
          {search.isLoading ? <LoadingList /> : (
            <>
              {(search.data?.users.length || 0) > 0 && (
                <section><h2 className="mb-3 font-display text-lg font-bold text-ink">People</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {search.data!.users.map((u) => (
                      <div key={u.id} className="glass flex items-center gap-3 p-4">
                        <Link to={`/profile/${u.username}`}><Avatar user={u} size={48} /></Link>
                        <div className="min-w-0 flex-1"><Link to={`/profile/${u.username}`} className="block truncate font-semibold text-ink hover:text-purple">{u.fullName}</Link><p className="truncate text-xs text-muted">@{u.username} · {u.city}</p></div>
                        <FollowButton userId={u.id} initialFollowing={false} />
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {(search.data?.posts.length || 0) > 0 && <section><h2 className="mb-3 font-display text-lg font-bold text-ink">Posts</h2><div className="space-y-4">{search.data!.posts.map((p) => <PostCard key={p.id} post={p} />)}</div></section>}
              {(search.data?.confessions.length || 0) > 0 && <section><h2 className="mb-3 font-display text-lg font-bold text-ink">Confessions</h2><div className="space-y-4">{search.data!.confessions.map((c) => <ConfessionCard key={c.id} confession={c} />)}</div></section>}
              {search.data && search.data.users.length === 0 && search.data.posts.length === 0 && search.data.confessions.length === 0 && (
                <EmptyState icon={<Compass className="h-6 w-6" />} title={`No results for "${q}"`} body="Try a different name, topic or keyword." />
              )}
            </>
          )}
        </div>
      ) : (
        <>
          <section>
            <h2 className="mb-3 font-display text-lg font-bold text-ink">Trending topics</h2>
            <div className="flex flex-wrap gap-2">{trendingTopics.map((t) => <Link key={t} to={`/confessions?topic=${t}`} className="chip !px-4 !py-2 !text-sm hover:bg-purple hover:text-white">#{t}</Link>)}</div>
          </section>
          <section>
            <h2 className="mb-3 font-display text-lg font-bold text-ink">Suggested for you</h2>
            {discover.isLoading ? <LoadingList /> : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(discover.data || []).map((u) => (
                  <div key={u.id} className="glass p-4 text-center">
                    <Link to={`/profile/${u.username}`}><Avatar user={u} size={64} className="mx-auto" /></Link>
                    <Link to={`/profile/${u.username}`} className="mt-2 block font-semibold text-ink hover:text-purple">{u.fullName}, {u.age}</Link>
                    <p className="text-xs text-muted">{u.city} · {u.matchPercent}% Match</p>
                    <p className="mt-1 text-xs text-muted">Match % is a compatibility estimate, not scientifically validated.</p>
                    <div className="mt-3 flex justify-center gap-2"><FollowButton userId={u.id} initialFollowing={false} /><Link to="/matching" className="btn-ghost !min-h-[36px] !px-4 !py-1.5 text-xs">View</Link></div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
