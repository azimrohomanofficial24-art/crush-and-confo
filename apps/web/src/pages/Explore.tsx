import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Compass, Search } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { Avatar, EmptyState, LoadingList } from '../components/ui'
import { ConfessionCard, FollowButton, PostCard } from '../components/feed'
import { DiscoverCard } from '../components/DiscoverCard'

export default function Explore() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const [input, setInput] = useState(q)
  // Keep the box in sync when the header search navigates here with a new
  // query — the old code initialised from q once and then went stale.
  useEffect(() => { setInput(q) }, [q])
  const search = useQuery({ queryKey: ['search', q], queryFn: () => api.search(q), enabled: q.length > 0 })
  const discover = useQuery({ queryKey: ['discover'], queryFn: () => api.discover(), enabled: !!user })
  const hashtags = useQuery({ queryKey: ['hashtags'], queryFn: () => api.trendingHashtags() })
  const like = useMutation({
    mutationFn: (id: string) => api.like(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['discover'] }); qc.invalidateQueries({ queryKey: ['matches'] }) },
  })
  const submit = (e: React.FormEvent) => { e.preventDefault(); setParams(input.trim() ? { q: input.trim() } : {}) }
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">Explore</h1>
        <p className="text-sm text-muted">Discover people, posts, confessions and trending topics.</p>
      </div>
      <form onSubmit={submit} className="max-w-xl">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search people, posts, or confessions…" className="input !rounded-full pl-11" aria-label="Search" />
        </div>
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
                        <div className="min-w-0 flex-1"><Link to={`/profile/${u.username}`} className="block truncate font-semibold text-ink hover:text-purple">{u.fullName}</Link><p className="truncate text-xs text-muted">@{u.username} · {u.city || 'Bangladesh'}</p></div>
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
            {hashtags.isLoading ? <LoadingList rows={1} /> : (hashtags.data || []).length === 0 ? (
              <p className="text-sm text-muted">No trending topics yet — topics appear here once people post with #hashtags.</p>
            ) : (
              <div className="flex flex-wrap gap-2">{(hashtags.data || []).map((h) => <Link key={h.tag} to={`/confessions?topic=${encodeURIComponent(h.tag)}`} className="chip !px-4 !py-2 !text-sm hover:bg-purple hover:text-white">#{h.tag}</Link>)}</div>
            )}
          </section>
          <section>
            <h2 className="mb-3 font-display text-lg font-bold text-ink">Suggested for you</h2>
            {!user ? (
              <div className="glass p-6 text-center">
                <p className="font-semibold text-ink">Log in to see people suggested for you</p>
                <p className="mt-1 text-sm text-muted">Suggestions are based on your real matching preferences.</p>
                <Link to="/register" className="btn-gradient mt-4">Create your account</Link>
              </div>
            ) : discover.isLoading ? <LoadingList /> : (discover.data || []).length === 0 ? (
              <EmptyState icon={<Compass className="h-6 w-6" />} title="No suggestions yet" body="New people joining will be suggested here." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(discover.data || []).map((u) => (
                  <DiscoverCard key={u.id} user={u} pending={like.isPending} onLike={(id) => like.mutate(id)} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
