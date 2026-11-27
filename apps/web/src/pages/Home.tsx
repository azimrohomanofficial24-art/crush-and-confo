import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, ChevronLeft, ChevronRight, Heart, MessageCircle, Play, Sparkles, Users } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, formatCount } from '../lib/api'
import { useAuth } from '../lib/auth'
import { Avatar, EmptyState, ErrorState, LoadingList, MatchNote, Spinner } from '../components/ui'
import { ConfessionCard, CreatePostCard, FollowButton, PostCard } from '../components/feed'
import { DiscoverCard } from '../components/DiscoverCard'

const HERO_SLIDES = [
  { title: 'Find Your Perfect Match', sub: 'Confess. Connect. Match.', gradient: 'linear-gradient(120deg,#F52D91 0%,#873BFA 55%,#17142C 100%)' },
  { title: 'Confess Anonymously', sub: 'Say what your heart holds — safely.', gradient: 'linear-gradient(120deg,#873BFA 0%,#F52D91 60%,#17142C 100%)' },
  { title: 'Meet Your Community', sub: 'Real people across Bangladesh — Dhaka, Chattogram, Sylhet and beyond.', gradient: 'linear-gradient(120deg,#17142C 0%,#873BFA 55%,#F52D91 100%)' },
]

export default function Home() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const [slide, setSlide] = useState(0)
  const [howOpen, setHowOpen] = useState(false)
  const discover = useQuery({ queryKey: ['discover'], queryFn: () => api.discover(), enabled: !!user })
  const matches = useQuery({ queryKey: ['matches'], queryFn: () => api.matches(), enabled: !!user })
  const confessions = useQuery({ queryKey: ['confessions'], queryFn: () => api.confessions() })
  const feed = useQuery({ queryKey: ['feed'], queryFn: () => api.feed() })
  const hashtags = useQuery({ queryKey: ['hashtags'], queryFn: () => api.trendingHashtags() })
  const myProfile = useQuery({ queryKey: ['profile', user?.username], queryFn: () => api.profile(user!.username), enabled: !!user?.username })
  const like = useMutation({
    mutationFn: (id: string) => api.like(id),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['discover'] }); qc.invalidateQueries({ queryKey: ['matches'] }) },
  })
  const pass = useMutation({
    mutationFn: (id: string) => api.pass(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['discover'] }) },
  })
  const hero = HERO_SLIDES[slide]
  const people = discover.data || []
  const matchList = matches.data || []

  return (
    <div className="space-y-5">
      <h1 className="sr-only">Crush and Confo — Home</h1>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl text-white shadow-glass" style={{ background: hero.gradient }} aria-label="Welcome">
        <div className="absolute inset-0 opacity-25" style={{ background: 'radial-gradient(500px 220px at 80% 20%, rgba(255,255,255,0.5), transparent 60%)' }} />
        <div className="relative p-6 sm:p-10">
          <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">Welcome to Crush and Confo</span>
          <h2 className="mt-4 max-w-lg font-display text-4xl font-extrabold leading-[1.05] sm:text-5xl">
            {hero.title.split(' ').slice(0, -1).join(' ')} <span className="text-pink-300">{hero.title.split(' ').slice(-1)}</span>
          </h2>
          <p className="mt-3 text-lg font-semibold text-white/90">{hero.sub}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link to="/explore" className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-pink shadow-lg transition hover:bg-lavender/60 active:scale-[0.98]">Start Exploring <ArrowRight className="h-4 w-4" /></Link>
            <button onClick={() => setHowOpen((v) => !v)} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/50 px-5 py-2.5 text-sm font-semibold backdrop-blur hover:bg-white/10">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-pink"><Play className="h-3.5 w-3.5 fill-pink" /></span> How it works
            </button>
          </div>
          {howOpen && (
            <div className="mt-5 max-w-xl rounded-2xl bg-white/15 p-4 text-sm backdrop-blur">
              <p className="font-semibold">How Crush and Confo works</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-white/90">
                <li>Create your profile (18+ only) and add your photo.</li>
                <li>Browse people, send a Like — a mutual Like creates a match.</li>
                <li>Chat only after a mutual match. Confess anonymously anytime.</li>
                <li>Be kind: reports and blocks keep the community safe.</li>
              </ol>
            </div>
          )}
          <div className="mt-6 flex items-center gap-2">
            <button onClick={() => setSlide((slide + HERO_SLIDES.length - 1) % HERO_SLIDES.length)} className="rounded-full bg-white/20 p-2 hover:bg-white/30" aria-label="Previous slide"><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-sm font-semibold">{slide + 1} / {HERO_SLIDES.length}</span>
            <button onClick={() => setSlide((slide + 1) % HERO_SLIDES.length)} className="rounded-full bg-white/20 p-2 hover:bg-white/30" aria-label="Next slide"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </section>

      {/* Discover — photo-led, real people only */}
      <section aria-label="Discover people">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="card-title flex items-center gap-2"><Sparkles className="h-5 w-5 text-pink" /> Discover people</h2>
          <Link to="/matching" className="text-sm font-semibold text-purple">See All →</Link>
        </div>
        {!user ? (
          <div className="glass p-6 text-center">
            <p className="font-semibold text-ink">Log in to discover people near you</p>
            <p className="mt-1 text-sm text-muted">Create your free account (18+) and start matching with real people across Bangladesh.</p>
            <Link to="/register" className="btn-gradient mt-4">Create your account</Link>
          </div>
        ) : discover.isLoading ? <LoadingList rows={3} /> : discover.isError ? <ErrorState message="Could not load people." onRetry={() => discover.refetch()} /> : people.length === 0 ? (
          <EmptyState icon={<Heart className="h-6 w-6" />} title="No one to discover yet" body="You're the first here — new people joining will appear in this space." action={<Link to="/community" className="btn-gradient">Visit the community</Link>} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {people.slice(0, 6).map((u) => (
              <DiscoverCard key={u.id} user={u} pending={like.isPending || pass.isPending} onLike={(id) => like.mutate(id)} onPass={(id) => pass.mutate(id)} />
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Left column: trending + matches */}
        <div className="space-y-5">
          <section className="glass p-5" aria-label="Trending topics">
            <div className="flex items-center justify-between">
              <h2 className="card-title">Trending topics</h2>
              <Link to="/explore" className="text-sm font-semibold text-purple">See All →</Link>
            </div>
            {hashtags.isLoading ? <LoadingList rows={1} /> : (hashtags.data || []).length === 0 ? (
              <p className="mt-3 text-sm text-muted">No trending topics yet — be the first to post with a #hashtag.</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {(hashtags.data || []).map((h) => <Link key={h.tag} to={`/confessions?topic=${encodeURIComponent(h.tag)}`} className="chip hover:bg-purple hover:text-white">#{h.tag}</Link>)}
              </div>
            )}
          </section>

          <section className="glass p-5" aria-label="Your matches">
            <div className="flex items-center justify-between">
              <h2 className="card-title flex items-center gap-2"><Heart className="h-5 w-5 fill-pink text-pink" /> Your Matches</h2>
              <Link to="/my-matches" className="text-sm font-semibold text-purple">See All →</Link>
            </div>
            {!user ? (
              <p className="mt-3 text-sm text-muted">Log in to see your matches.</p>
            ) : matchList.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No matches yet — send a Like in Discover and mutual likes will appear here.</p>
            ) : (
              <div className="mt-4 flex items-center gap-2">
                {matchList.slice(0, 4).map((m) => (
                  <Link key={m.id} to={`/profile/${m.otherUser.username}`} title={m.otherUser.fullName}><Avatar user={m.otherUser} size={48} className="ring-2 ring-white shadow-soft" /></Link>
                ))}
                {matchList.length > 4 && <Link to="/my-matches" className="flex h-12 w-12 items-center justify-center rounded-full bg-lavender text-sm font-bold text-purple">+{matchList.length - 4}</Link>}
              </div>
            )}
          </section>
        </div>

        {/* Middle column: create post + feed */}
        <div className="space-y-5">
          <CreatePostCard />
          {feed.isLoading ? <LoadingList /> : feed.isError ? <ErrorState message="Could not load the feed." onRetry={() => feed.refetch()} /> : (feed.data || []).length === 0 ? (
            <EmptyState icon={<Users className="h-6 w-6" />} title="No posts yet" body="Be the first to share something with the community." />
          ) : (feed.data || []).slice(0, 3).map((p) => <PostCard key={p.id} post={p} />)}
          <Link to="/community" className="btn-ghost w-full">View full community feed →</Link>
        </div>

        {/* Right column: profile + confessions + people to follow */}
        <div className="space-y-5">
          {user ? (
            <section className="glass p-5 text-center" aria-label="Your profile">
              <Avatar user={user} size={84} className="mx-auto" />
              <h2 className="mt-3 flex items-center justify-center gap-1.5 font-display text-xl font-bold text-ink">{user.fullName} {user.verified && <BadgeCheck className="h-5 w-5 text-blue-500" />}</h2>
              <p className="text-sm text-muted">@{user.username}</p>
              {user.bio && <p className="mt-1 text-sm text-ink/80">{user.bio}</p>}
              {!user.avatarUrl && <p className="mt-2 text-xs text-muted">Add your photo in <Link className="font-semibold text-purple" to="/settings">Settings</Link> — photo-led profiles get seen first.</p>}
              <div className="mt-4 grid grid-cols-3 divide-x divide-lavender">
                {[[formatCount(myProfile.data?.counts.posts ?? 0), 'Posts'], [formatCount(myProfile.data?.counts.followers ?? 0), 'Followers'], [formatCount(myProfile.data?.counts.following ?? 0), 'Following']].map(([v, l]) => (
                  <div key={l}><p className="font-display text-lg font-extrabold text-ink">{v}</p><p className="text-xs text-muted">{l}</p></div>
                ))}
              </div>
              <Link to={`/profile/${user.username}`} className="btn-gradient mt-4 w-full">View Profile <ArrowRight className="h-4 w-4" /></Link>
            </section>
          ) : (
            <section className="glass p-5 text-center" aria-label="Join Crush and Confo">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-pink/10"><Heart className="h-7 w-7 fill-pink text-pink" /></span>
              <h2 className="mt-3 font-display text-xl font-bold text-ink">Join Crush and Confo</h2>
              <p className="mt-1 text-sm text-muted">Confess anonymously, connect with real people and match — free, 18+ only.</p>
              <Link to="/register" className="btn-gradient mt-4 w-full">Create your account</Link>
              <Link to="/login" className="btn-ghost mt-2 w-full">Log in</Link>
            </section>
          )}

          <section className="glass p-5" aria-label="Latest confessions">
            <div className="flex items-center justify-between">
              <h2 className="card-title flex items-center gap-2"><MessageCircle className="h-5 w-5 text-pink" /> Latest Confessions</h2>
              <Link to="/confessions" className="text-sm font-semibold text-purple">See All →</Link>
            </div>
            <div className="mt-3 space-y-3">
              {confessions.isLoading ? <LoadingList rows={2} /> : (confessions.data || []).length === 0 ? (
                <p className="text-sm text-muted">No confessions yet — be the first to share.</p>
              ) : (confessions.data || []).slice(0, 2).map((c) => <ConfessionCard key={c.id} confession={c} />)}
            </div>
          </section>

          <section className="glass p-5" aria-label="People to follow">
            <h2 className="card-title">People to follow</h2>
            {!user ? (
              <p className="mt-3 text-sm text-muted">Log in to see people you can follow.</p>
            ) : people.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No one to follow yet.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {people.slice(0, 3).map((u) => (
                  <div key={u.id} className="flex items-center gap-3">
                    <Link to={`/profile/${u.username}`}><Avatar user={u} size={40} /></Link>
                    <div className="min-w-0 flex-1"><p className="truncate font-semibold text-ink">{u.fullName}</p><p className="truncate text-xs text-muted">@{u.username} · {u.city || 'Bangladesh'}</p></div>
                    <FollowButton userId={u.id} initialFollowing={false} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
      <p className="text-xs text-muted">Crush and Confo is for adults 18+. Be kind, be honest, and respect privacy — anonymous confessions never show your name publicly.</p>
      <MatchNote />
    </div>
  )
}
