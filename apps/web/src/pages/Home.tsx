import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, ChevronLeft, ChevronRight, Crown, Diamond, Flame, Heart, MessageCircle, Play, TrendingUp, Users } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, formatCount } from '../lib/api'
import { currentUser, trendingTopics } from '../lib/demoData'
import { Avatar, DemoBadge, EmptyState, ErrorState, LoadingList, MatchNote, Spinner } from '../components/ui'
import { ConfessionCard, CreatePostCard, FollowButton, PostCard } from '../components/feed'

const HERO_SLIDES = [
  { title: 'Find Your Perfect Match', sub: 'Confess. Connect. Match.', gradient: 'linear-gradient(120deg,#F52D91 0%,#873BFA 55%,#17142C 100%)' },
  { title: 'Confess Anonymously', sub: 'Say what your heart holds — safely.', gradient: 'linear-gradient(120deg,#873BFA 0%,#F52D91 60%,#17142C 100%)' },
  { title: 'Meet Your Community', sub: '12K+ people online right now.', gradient: 'linear-gradient(120deg,#17142C 0%,#873BFA 55%,#F52D91 100%)' },
]

export default function Home() {
  const qc = useQueryClient()
  const [slide, setSlide] = useState(0)
  const [demoOpen, setDemoOpen] = useState(false)
  const discover = useQuery({ queryKey: ['discover'], queryFn: () => api.discover() })
  const matches = useQuery({ queryKey: ['matches'], queryFn: () => api.matches() })
  const confessions = useQuery({ queryKey: ['confessions'], queryFn: () => api.confessions() })
  const feed = useQuery({ queryKey: ['feed'], queryFn: () => api.feed() })
  const like = useMutation({
    mutationFn: (id: string) => api.like(id),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['discover'] }); qc.invalidateQueries({ queryKey: ['matches'] }); if (res.matched) alert('It\'s a match! You can now message each other.') },
  })
  const top = discover.data?.[0]
  const hero = HERO_SLIDES[slide]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2"><h1 className="sr-only">Crush and Confo — Home</h1><DemoBadge /></div>

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
            <Link to="/explore" className="btn-gradient !bg-white !text-pink shadow-none">Start Exploring <ArrowRight className="h-4 w-4" /></Link>
            <button onClick={() => setDemoOpen((v) => !v)} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/50 px-5 py-2.5 text-sm font-semibold backdrop-blur hover:bg-white/10">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-pink"><Play className="h-3.5 w-3.5 fill-pink" /></span> Watch Demo
            </button>
          </div>
          {demoOpen && (
            <div className="mt-5 max-w-xl rounded-2xl bg-white/15 p-4 text-sm backdrop-blur">
              <p className="font-semibold">How Crush and Confo works</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-white/90">
                <li>Create your profile (18+ only) and set what you are looking for.</li>
                <li>Browse matches, send a Like — a mutual Like creates a match.</li>
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

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Platform statistics">
        {[
          { icon: Heart, label: 'Total Users', value: '98K+', color: 'text-pink', bg: 'bg-pink/10' },
          { icon: Users, label: 'Active Online', value: '12K+', color: 'text-purple', bg: 'bg-purple/10' },
          { icon: MessageCircle, label: 'Total Messages', value: '95K+', color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { icon: Flame, label: 'Confessions', value: '56K+', color: 'text-warning', bg: 'bg-warning/10' },
        ].map((s) => (
          <div key={s.label} className="glass flex items-center gap-3 p-4">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${s.bg} ${s.color}`}><s.icon className="h-5 w-5" /></span>
            <div><p className="font-display text-xl font-extrabold text-ink">{s.value}</p><p className="text-xs text-muted">{s.label}</p></div>
            <TrendingUp className="ml-auto hidden h-4 w-4 text-success sm:block" />
          </div>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Left column: matching + trending */}
        <div className="space-y-5">
          <section className="glass p-5" aria-label="Matching">
            <div className="flex items-center justify-between">
              <h2 className="card-title flex items-center gap-2"><Heart className="h-5 w-5 fill-pink text-pink" /> Matching</h2>
              <Link to="/matching" className="text-sm font-semibold text-purple">See All →</Link>
            </div>
            {discover.isLoading ? <LoadingList rows={1} /> : discover.isError ? <ErrorState message="Could not load matches." onRetry={() => discover.refetch()} /> : top ? (
              <div className="mt-4 flex items-center gap-4">
                <Link to={`/profile/${top.username}`} className="relative block w-32 shrink-0 overflow-hidden rounded-3xl shadow-glass">
                  <span className="block aspect-[3/4] w-full" style={{ background: `linear-gradient(160deg, ${top.avatarColor}, #873BFA)` }}>
                    <span className="flex h-full items-center justify-center text-4xl font-extrabold text-white">{top.avatarInitials}</span>
                  </span>
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/80 to-transparent p-3 pt-8 text-white">
                    <span className="block font-bold">{top.fullName}</span>
                    <span className="text-xs">{top.age} · {top.city}</span>
                  </span>
                  <span className="absolute right-2 top-2 rounded-full bg-pink p-1.5 text-white"><Heart className="h-3.5 w-3.5 fill-white" /></span>
                </Link>
                <div className="flex flex-1 flex-col items-center gap-3">
                  <div className="relative flex h-24 w-24 items-center justify-center">
                    <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90"><circle cx="50" cy="50" r="42" fill="none" stroke="#E9DFFF" strokeWidth="9" /><circle cx="50" cy="50" r="42" fill="none" stroke="url(#ring)" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(top.matchPercent || 80) * 2.64} 264`} /><defs><linearGradient id="ring"><stop offset="0%" stopColor="#F52D91" /><stop offset="100%" stopColor="#873BFA" /></linearGradient></defs></svg>
                    <span className="absolute text-center text-lg font-extrabold text-ink">{top.matchPercent}%<span className="block text-[10px] font-semibold text-muted">Match</span></span>
                  </div>
                  <button className="btn-gradient w-full" disabled={like.isPending} onClick={() => like.mutate(top.id)}>{like.isPending ? <Spinner /> : <>Send Like <Heart className="h-4 w-4 fill-white" /></>}</button>
                  <MatchNote />
                </div>
              </div>
            ) : <EmptyState icon={<Heart className="h-6 w-6" />} title="No more people to show" body="Check back later for new matches." />}
          </section>

          <section className="glass p-5" aria-label="Trending topics">
            <div className="flex items-center justify-between">
              <h2 className="card-title flex items-center gap-2"><Flame className="h-5 w-5 text-warning" /> Trending Topics</h2>
              <Link to="/explore" className="text-sm font-semibold text-purple">See All →</Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {trendingTopics.map((t) => <Link key={t} to={`/confessions?topic=${t}`} className="chip hover:bg-purple hover:text-white">#{t}</Link>)}
            </div>
          </section>

          <section className="glass p-5" aria-label="Your matches">
            <div className="flex items-center justify-between">
              <h2 className="card-title flex items-center gap-2"><Heart className="h-5 w-5 fill-pink text-pink" /> Your Matches</h2>
              <Link to="/my-matches" className="text-sm font-semibold text-purple">See All →</Link>
            </div>
            <div className="mt-4 flex items-center gap-2">
              {(matches.data || []).slice(0, 4).map((u) => (
                <Link key={u.id} to={`/profile/${u.username}`} title={u.fullName}><Avatar user={u} size={48} className="ring-2 ring-white shadow-soft" /></Link>
              ))}
              <Link to="/my-matches" className="flex h-12 w-12 items-center justify-center rounded-full bg-lavender text-sm font-bold text-purple">+{(matches.data?.length || 0) > 4 ? (matches.data!.length - 4) : 7}</Link>
            </div>
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

        {/* Right column: profile + confessions + premium */}
        <div className="space-y-5">
          <section className="glass p-5 text-center" aria-label="Your profile">
            <Avatar user={currentUser} size={84} className="mx-auto" />
            <h2 className="mt-3 flex items-center justify-center gap-1.5 font-display text-xl font-bold text-ink">{currentUser.fullName} {currentUser.verified && <BadgeCheck className="h-5 w-5 text-blue-500" />}</h2>
            <p className="text-sm text-muted">@{currentUser.username}</p>
            <p className="mt-1 text-sm text-ink/80">{currentUser.bio}</p>
            <div className="mt-4 grid grid-cols-3 divide-x divide-lavender">
              {[[formatCount(currentUser.posts), 'Posts'], [formatCount(currentUser.followers), 'Followers'], [formatCount(currentUser.following), 'Following']].map(([v, l]) => (
                <div key={l}><p className="font-display text-lg font-extrabold text-ink">{v}</p><p className="text-xs text-muted">{l}</p></div>
              ))}
            </div>
            <Link to={`/profile/${currentUser.username}`} className="btn-gradient mt-4 w-full">View Profile <ArrowRight className="h-4 w-4" /></Link>
          </section>

          <section className="glass p-5" aria-label="Latest confessions">
            <div className="flex items-center justify-between">
              <h2 className="card-title flex items-center gap-2"><MessageCircle className="h-5 w-5 text-pink" /> Latest Confessions</h2>
              <Link to="/confessions" className="text-sm font-semibold text-purple">See All →</Link>
            </div>
            <div className="mt-3 space-y-3">
              {confessions.isLoading ? <LoadingList rows={2} /> : (confessions.data || []).slice(0, 2).map((c) => <ConfessionCard key={c.id} confession={c} />)}
            </div>
          </section>

          <Link to="/settings?tab=premium" className="block rounded-3xl bg-gradient-to-r from-pink to-purple p-5 text-white shadow-glass transition hover:opacity-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Diamond className="h-8 w-8" />
                <div><p className="font-display text-lg font-bold">Upgrade to Premium</p><p className="text-sm text-white/85">Get more matches, unlock features & more!</p></div>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0" />
            </div>
          </Link>

          <section className="glass p-5" aria-label="People to follow">
            <h2 className="card-title">People to follow</h2>
            <div className="mt-3 space-y-3">
              {(discover.data || []).slice(1, 4).map((u) => (
                <div key={u.id} className="flex items-center gap-3">
                  <Link to={`/profile/${u.username}`}><Avatar user={u} size={40} /></Link>
                  <div className="min-w-0 flex-1"><p className="truncate font-semibold text-ink">{u.fullName}</p><p className="truncate text-xs text-muted">@{u.username} · {u.city}</p></div>
                  <FollowButton userId={u.id} initialFollowing={false} />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
      <p className="flex items-center gap-2 text-xs text-muted"><Crown className="h-3.5 w-3.5 text-warning" /> Crush and Confo is for adults 18+. Be kind, be honest, and respect privacy — anonymous confessions are never traced back to you.</p>
    </div>
  )
}
