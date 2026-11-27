import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Bookmark, Crown, Heart, Lock, MapPin, Save, Settings as SettingsIcon, ShieldAlert, Trash2, UserRound, Users } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { currentUser, resetDemo, trendingTopics } from '../lib/demoData'
import { useAuth } from '../lib/auth'
import { Avatar, EmptyState, ErrorState, LoadingList, MatchNote, Modal, Spinner } from '../components/ui'
import { ConfessionCard, FollowButton, PostCard } from '../components/feed'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingList />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export function Dashboard() {
  const { user } = useAuth()
  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">Welcome back, {user?.fullName.split(' ')[0] || 'friend'}</h1>
      <p className="text-sm text-muted">Your personal dashboard — matches, messages and confessions at a glance.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Link to="/my-matches" className="glass p-5 hover:shadow-glass"><Heart className="h-6 w-6 text-pink" /><p className="mt-2 font-display text-xl font-extrabold text-ink">My Matches</p><p className="text-sm text-muted">See everyone you matched with.</p></Link>
        <Link to="/messages" className="glass p-5 hover:shadow-glass"><Users className="h-6 w-6 text-purple" /><p className="mt-2 font-display text-xl font-extrabold text-ink">Messages</p><p className="text-sm text-muted">Continue your conversations.</p></Link>
        <Link to="/my-confessions" className="glass p-5 hover:shadow-glass"><Bookmark className="h-6 w-6 text-warning" /><p className="mt-2 font-display text-xl font-extrabold text-ink">My Confessions</p><p className="text-sm text-muted">Everything you have shared.</p></Link>
      </div>
      <div className="glass p-5">
        <h2 className="card-title">Quick links</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/matching-preferences" className="btn-ghost">Matching preferences</Link>
          <Link to="/saved" className="btn-ghost">Saved posts</Link>
          <Link to="/followers" className="btn-ghost">Followers</Link>
          <Link to="/following" className="btn-ghost">Following</Link>
          <Link to="/blocked" className="btn-ghost">Blocked users</Link>
          <Link to="/settings" className="btn-ghost">Settings</Link>
        </div>
      </div>
    </div>
  )
}

export function MyMatches() {
  const qc = useQueryClient()
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const list = useQuery({ queryKey: ['matches'], queryFn: () => api.matches() })
  const unmatch = useMutation({ mutationFn: (id: string) => api.unmatch(id), onSuccess: () => { setConfirmId(null); qc.invalidateQueries({ queryKey: ['matches'] }) } })
  return (
    <div className="space-y-5">
      <div><h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">My Matches</h1><p className="text-sm text-muted">People who liked you back. Chat opens only after a mutual match.</p><MatchNote /></div>
      {list.isLoading ? <LoadingList /> : list.isError ? <ErrorState message="Could not load matches." onRetry={() => list.refetch()} /> : (list.data || []).length === 0 ? (
        <EmptyState icon={<Heart className="h-6 w-6" />} title="No matches yet" body="Keep liking people in Matching — mutual likes appear here." action={<Link to="/matching" className="btn-gradient">Start matching</Link>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(list.data || []).map((u) => (
            <div key={u.id} className="glass p-4">
              <div className="flex items-center gap-3">
                <Link to={`/profile/${u.username}`}><Avatar user={u} size={56} /></Link>
                <div className="min-w-0 flex-1"><Link to={`/profile/${u.username}`} className="block truncate font-semibold text-ink hover:text-purple">{u.fullName}, {u.age}</Link><p className="text-xs text-muted">{u.city} · {u.matchPercent}% Match</p></div>
              </div>
              <div className="mt-3 flex gap-2">
                <Link to="/messages" className="btn-gradient flex-1 !min-h-[40px] !py-2 text-xs">Message</Link>
                <button className="btn-danger" onClick={() => setConfirmId(u.id)}>Unmatch</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {confirmId && (
        <Modal title="Unmatch this person?" onClose={() => setConfirmId(null)}>
          <p className="text-sm text-muted">Unmatching removes the conversation and they will no longer be able to message you.</p>
          <div className="mt-4 flex gap-2">
            <button className="btn-danger flex-1" disabled={unmatch.isPending} onClick={() => unmatch.mutate(confirmId)}>{unmatch.isPending ? <Spinner /> : 'Unmatch'}</button>
            <button className="btn-ghost flex-1" onClick={() => setConfirmId(null)}>Keep match</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export function Saved() {
  const posts = useQuery({ queryKey: ['saved'], queryFn: () => api.savedPosts() })
  const confs = useQuery({ queryKey: ['saved-confs'], queryFn: () => api.savedConfessions() })
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">Saved</h1>
      <p className="text-sm text-muted">Posts and confessions you saved for later. Only you can see this page.</p>
      {posts.isLoading || confs.isLoading ? <LoadingList /> : (
        <>
          {(posts.data || []).map((p) => <PostCard key={p.id} post={p} />)}
          {(confs.data || []).map((c) => <ConfessionCard key={c.id} confession={c} />)}
          {(posts.data || []).length === 0 && (confs.data || []).length === 0 && (
            <EmptyState icon={<Save className="h-6 w-6" />} title="Nothing saved yet" body="Tap Save on any post or confession to find it here later." action={<Link to="/explore" className="btn-gradient">Explore</Link>} />
          )}
        </>
      )}
    </div>
  )
}

export function MyConfessions() {
  const list = useQuery({ queryKey: ['my-confessions'], queryFn: () => api.myConfessions() })
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">My Confessions</h1>
      <p className="text-sm text-muted">Only you can see this list — anonymous confessions stay anonymous to everyone else.</p>
      {list.isLoading ? <LoadingList /> : (list.data || []).length === 0 ? (
        <EmptyState icon={<Heart className="h-6 w-6" />} title="You haven't confessed yet" body="Share what's on your heart — anonymously if you like." action={<Link to="/confessions" className="btn-gradient">Write a confession</Link>} />
      ) : (list.data || []).map((c) => <ConfessionCard key={c.id} confession={c} />)}
    </div>
  )
}

function PeopleList({ title, queryKey, fetcher }: { title: string; queryKey: string; fetcher: () => Promise<import('../lib/types').User[]> }) {
  const list = useQuery({ queryKey: [queryKey], queryFn: fetcher })
  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{title}</h1>
      {list.isLoading ? <LoadingList /> : list.isError ? <ErrorState message="Could not load people." onRetry={() => list.refetch()} /> : (list.data || []).length === 0 ? (
        <EmptyState icon={<Users className="h-6 w-6" />} title="Nobody here yet" body="When people follow you or you follow them, they will show up here." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {(list.data || []).map((u) => (
            <div key={u.id} className="glass flex items-center gap-3 p-4">
              <Link to={`/profile/${u.username}`}><Avatar user={u} size={48} /></Link>
              <div className="min-w-0 flex-1"><Link to={`/profile/${u.username}`} className="block truncate font-semibold text-ink hover:text-purple">{u.fullName}</Link><p className="truncate text-xs text-muted">@{u.username} · {u.city}</p></div>
              <FollowButton userId={u.id} initialFollowing={queryKey === 'following'} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
export const Followers = () => <PeopleList title="Followers" queryKey="followers" fetcher={() => api.followers()} />
export const Following = () => <PeopleList title="Following" queryKey="following" fetcher={() => api.following()} />

export function Blocked() {
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['blocked'], queryFn: () => api.blockedUsers() })
  const unblock = useMutation({ mutationFn: (id: string) => api.unblock(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['blocked'] }) })
  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">Blocked users</h1>
      <p className="text-sm text-muted">Blocked people cannot message you, see your posts, or appear in matching.</p>
      {list.isLoading ? <LoadingList /> : (list.data || []).length === 0 ? (
        <EmptyState icon={<ShieldAlert className="h-6 w-6" />} title="Nobody blocked" body="You can block someone from their profile if you ever need to." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {(list.data || []).map((u) => (
            <div key={u.id} className="glass flex items-center gap-3 p-4">
              <Avatar user={u} size={48} />
              <div className="min-w-0 flex-1"><p className="truncate font-semibold text-ink">{u.fullName}</p><p className="truncate text-xs text-muted">@{u.username}</p></div>
              <button className="btn-ghost !min-h-[36px] !px-4 !py-1.5 text-xs" disabled={unblock.isPending} onClick={() => unblock.mutate(u.id)}>Unblock</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function MatchingPreferences() {
  const [prefs, setPrefs] = useState({ minAge: 18, maxAge: 30, maxDistanceKm: 50, interestedIn: 'Female', topics: ['Love', 'Music'] })
  const [saved, setSaved] = useState(false)
  const save = () => { try { localStorage.setItem('cc-matching-prefs', JSON.stringify(prefs)) } catch { /* ignore */ } setSaved(true); setTimeout(() => setSaved(false), 2500) }
  useEffect(() => { try { const raw = localStorage.getItem('cc-matching-prefs'); if (raw) setPrefs(JSON.parse(raw)) } catch { /* ignore */ } }, [])
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">Matching preferences</h1>
      <p className="text-sm text-muted">These shape who you see in Matching. Match % is a compatibility estimate, not scientifically validated.</p>
      <section className="glass space-y-5 p-5">
        <div>
          <label className="label" htmlFor="pref-age">Age range: {prefs.minAge} – {prefs.maxAge}</label>
          <div className="flex items-center gap-3">
            <input id="pref-age" type="range" min={18} max={60} value={prefs.minAge} onChange={(e) => setPrefs({ ...prefs, minAge: Math.min(Number(e.target.value), prefs.maxAge) })} className="w-full accent-pink" aria-label="Minimum age" />
            <input type="range" min={18} max={60} value={prefs.maxAge} onChange={(e) => setPrefs({ ...prefs, maxAge: Math.max(Number(e.target.value), prefs.minAge) })} className="w-full accent-purple" aria-label="Maximum age" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="pref-dist">Maximum distance: {prefs.maxDistanceKm} km</label>
          <input id="pref-dist" type="range" min={5} max={500} step={5} value={prefs.maxDistanceKm} onChange={(e) => setPrefs({ ...prefs, maxDistanceKm: Number(e.target.value) })} className="w-full accent-purple" />
        </div>
        <div>
          <label className="label" htmlFor="pref-int">Interested in</label>
          <select id="pref-int" className="input" value={prefs.interestedIn} onChange={(e) => setPrefs({ ...prefs, interestedIn: e.target.value })}>
            <option>Female</option><option>Male</option><option>Everyone</option>
          </select>
        </div>
        <div>
          <span className="label">Topics you care about</span>
          <div className="flex flex-wrap gap-2">
            {trendingTopics.map((t) => (
              <button key={t} onClick={() => setPrefs({ ...prefs, topics: prefs.topics.includes(t) ? prefs.topics.filter((x) => x !== t) : [...prefs.topics, t] })} className={prefs.topics.includes(t) ? 'chip !bg-purple !text-white' : 'chip'}>#{t}</button>
            ))}
          </div>
        </div>
        <button className="btn-gradient" onClick={save}>{saved ? 'Saved!' : 'Save preferences'}</button>
      </section>
    </div>
  )
}

export function Settings() {
  const [params] = useSearchParams()
  const tab = params.get('tab') || 'profile'
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [bio, setBio] = useState(currentUser.bio)
  const [city, setCity] = useState(currentUser.city)
  const [saved, setSaved] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState({ likes: true, matches: true, messages: true, comments: false })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const saveProfile = () => { currentUser.bio = bio; currentUser.city = city; setSaved(true); setTimeout(() => setSaved(false), 2500) }
  const deleteAccount = async () => { await logout(); navigate('/'); }
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">Settings</h1>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Settings sections">
        {(['profile', 'notifications', 'privacy', 'premium'] as const).map((t) => (
          <Link key={t} to={`/settings?tab=${t}`} className={tab === t ? 'btn-gradient !min-h-[36px] !px-4 !py-1.5 text-xs capitalize' : 'btn-ghost !min-h-[36px] !px-4 !py-1.5 text-xs capitalize'}>{t}</Link>
        ))}
      </div>
      {tab === 'profile' && (
        <section className="glass space-y-4 p-5">
          <h2 className="card-title flex items-center gap-2"><UserRound className="h-5 w-5 text-purple" /> Edit profile</h2>
          <div className="flex items-center gap-3"><Avatar user={user || currentUser} size={64} /><div><p className="font-semibold text-ink">{user?.fullName}</p><p className="text-sm text-muted">@{user?.username}</p></div></div>
          <div><label className="label" htmlFor="set-bio">Bio</label><textarea id="set-bio" rows={3} className="input resize-none" value={bio} onChange={(e) => setBio(e.target.value)} /></div>
          <div><label className="label" htmlFor="set-city">City</label><input id="set-city" className="input" value={city} onChange={(e) => setCity(e.target.value)} /></div>
          <p className="flex items-center gap-1.5 text-sm text-muted"><MapPin className="h-4 w-4" /> Location is used for matching distance — never shared precisely.</p>
          <button className="btn-gradient" onClick={saveProfile}>{saved ? 'Saved!' : 'Save changes'}</button>
        </section>
      )}
      {tab === 'notifications' && (
        <section className="glass space-y-4 p-5">
          <h2 className="card-title">Notification preferences</h2>
          {(Object.keys(notifPrefs) as (keyof typeof notifPrefs)[]).map((k) => (
            <label key={k} className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-lavender/40 px-4 py-3 text-sm font-medium capitalize">
              {k === 'likes' ? 'New likes' : k === 'matches' ? 'New matches' : k === 'messages' ? 'New messages' : 'New comments'}
              <input type="checkbox" checked={notifPrefs[k]} onChange={(e) => setNotifPrefs({ ...notifPrefs, [k]: e.target.checked })} className="h-5 w-5 accent-purple" />
            </label>
          ))}
          <p className="text-sm text-muted">Preferences are saved on your device in demo mode and synced to your account when the live API is connected.</p>
        </section>
      )}
      {tab === 'privacy' && (
        <section className="glass space-y-4 p-5">
          <h2 className="card-title flex items-center gap-2"><Lock className="h-5 w-5 text-purple" /> Privacy & safety</h2>
          <Link to="/blocked" className="btn-ghost w-full justify-start">Manage blocked users</Link>
          <Link to="/safety" className="btn-ghost w-full justify-start">Safety tips</Link>
          <Link to="/privacy" className="btn-ghost w-full justify-start">Privacy policy</Link>
          <button className="btn-ghost w-full justify-start" onClick={() => { resetDemo(); window.location.reload() }}>Reset demo data</button>
          <div className="rounded-2xl border border-error/30 bg-error/5 p-4">
            <h3 className="flex items-center gap-2 font-semibold text-error"><Trash2 className="h-4 w-4" /> Delete account</h3>
            <p className="mt-1 text-sm text-muted">This permanently deletes your profile, posts, confessions and messages. This cannot be undone.</p>
            {!confirmDelete ? (
              <button className="btn-danger mt-3" onClick={() => setConfirmDelete(true)}>Delete my account</button>
            ) : (
              <div className="mt-3 flex gap-2">
                <button className="btn-danger flex-1" onClick={deleteAccount}>Yes, delete everything</button>
                <button className="btn-ghost flex-1" onClick={() => setConfirmDelete(false)}>Cancel</button>
              </div>
            )}
          </div>
        </section>
      )}
      {tab === 'premium' && (
        <section className="glass space-y-4 p-5 text-center">
          <Crown className="mx-auto h-10 w-10 text-warning" />
          <h2 className="card-title">Go Premium</h2>
          <p className="text-sm text-muted">More matches, unlimited Super Likes, see who liked you, and an ad-free experience.</p>
          <ul className="mx-auto max-w-sm space-y-2 text-left text-sm">
            <li>✓ See who liked you</li><li>✓ Unlimited Super Likes</li><li>✓ Priority in matching</li><li>✓ Read receipts in chat</li>
          </ul>
          <p className="rounded-2xl bg-lavender/50 p-3 text-sm text-muted">Payments are not enabled yet — Premium checkout will be added with the billing provider. This page is a preview of the plan.</p>
          <button className="btn-gradient" onClick={() => alert('Premium checkout is not enabled yet. Payments will be added with the billing provider.')}>Upgrade to Premium</button>
        </section>
      )}
      <p className="flex items-center gap-2 text-xs text-muted"><SettingsIcon className="h-3.5 w-3.5" /> Signed in as {user?.username || 'demo user'} · <button className="font-semibold text-error underline" onClick={() => { logout(); navigate('/') }}>Log out</button></p>
    </div>
  )
}
