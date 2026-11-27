import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BadgeCheck, Ban, Flag, MapPin, MessageCircle, ShieldAlert, UserRound } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, formatCount } from '../lib/api'
import { useAuth } from '../lib/auth'
import { Avatar, EmptyState, ErrorState, LoadingList, MatchNote, Modal, Spinner } from '../components/ui'
import { FollowButton, PostCard } from '../components/feed'

export default function Profile() {
  const { username } = useParams<{ username: string }>()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { user: me } = useAuth()
  const [blockOpen, setBlockOpen] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const profile = useQuery({ queryKey: ['profile', username], queryFn: () => api.profile(username || '') })
  const myPosts = useQuery({ queryKey: ['posts-by', profile.data?.user.id], queryFn: () => api.postsByAuthor(profile.data!.user.id), enabled: !!profile.data?.user.id })
  const following = useQuery({ queryKey: ['following-check', profile.data?.user.id], queryFn: () => api.isFollowing(profile.data!.user.id), enabled: !!profile.data?.user.id })
  const matches = useQuery({ queryKey: ['matches'], queryFn: () => api.matches(), enabled: !!me })
  const block = useMutation({
    mutationFn: () => api.block(profile.data!.user.id),
    onSuccess: () => { setBlocked(true); setBlockOpen(false); qc.invalidateQueries({ queryKey: ['discover'] }) },
  })
  const report = useMutation({ mutationFn: () => api.report(profile.data!.user.id, 'user', 'Reported from profile') })
  const message = useMutation({
    mutationFn: async () => {
      const match = (matches.data || []).find((m) => m.otherUser.id === profile.data!.user.id)
      if (!match) throw new Error('No match yet')
      return api.startConversation(match.id)
    },
    onSuccess: (conv) => navigate(`/messages?active=${conv.id}`),
  })
  if (profile.isLoading) return <LoadingList />
  if (profile.isError || !profile.data) return <ErrorState message={profile.isError ? 'Could not load this profile.' : 'This profile does not exist.'} onRetry={() => profile.refetch()} />
  const { user: u, counts } = profile.data
  const isMe = u.id === me?.id
  const isMatched = (matches.data || []).some((m) => m.otherUser.id === u.id)
  const posts = myPosts.data || []
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="glass overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-pink via-purple to-navy" />
        <div className="p-5 pt-0">
          <div className="-mt-10 flex flex-wrap items-end justify-between gap-3">
            <Avatar user={u} size={88} className="ring-4 ring-white" />
            <div className="flex flex-wrap gap-2">
              {isMe ? <Link to="/settings" className="btn-ghost">Edit profile</Link> : (
                <>
                  {isMatched ? (
                    <button onClick={() => message.mutate()} disabled={message.isPending} className="btn-gradient !min-h-[40px] !py-2 text-xs">{message.isPending ? <Spinner /> : <><MessageCircle className="h-4 w-4" /> Message</>}</button>
                  ) : (
                    <span className="inline-flex min-h-[40px] items-center rounded-full bg-lavender/60 px-4 py-2 text-xs font-semibold text-muted" title="Chat opens after a mutual Like">Message after matching</span>
                  )}
                  <FollowButton userId={u.id} initialFollowing={following.data || false} />
                  <button onClick={() => setBlockOpen(true)} className="btn-danger"><Ban className="h-4 w-4" /> Block</button>
                  <button onClick={() => report.mutate()} disabled={report.isPending} className="btn-danger"><Flag className="h-4 w-4" /> {report.isSuccess ? 'Reported' : 'Report'}</button>
                </>
              )}
            </div>
          </div>
          <h1 className="mt-3 flex items-center gap-1.5 font-display text-2xl font-extrabold text-ink">{u.fullName} {u.verified && <BadgeCheck className="h-5 w-5 text-blue-500" />}</h1>
          <p className="text-sm text-muted">@{u.username}{u.age != null ? ` · ${u.age}` : ''}</p>
          <p className="mt-2 flex items-center gap-1 text-sm text-muted"><MapPin className="h-4 w-4" /> {u.city || 'Bangladesh'}{u.country ? `, ${u.country}` : ''}</p>
          {u.bio && <p className="mt-2 text-[15px] text-ink/90">{u.bio}</p>}
          {u.interests.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{u.interests.map((i) => <span key={i} className="chip">{i}</span>)}</div>}
          {u.matchPercent && <div className="mt-3"><p className="text-sm font-semibold text-ink">{u.matchPercent}% Match</p><MatchNote /></div>}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-lavender/50 p-3"><p className="font-display text-lg font-extrabold text-ink">{formatCount(counts.posts)}</p><p className="text-xs text-muted">Posts</p></div>
            <div className="rounded-2xl bg-lavender/50 p-3"><p className="font-display text-lg font-extrabold text-ink">{formatCount(counts.followers)}</p><p className="text-xs text-muted">Followers</p></div>
            <div className="rounded-2xl bg-lavender/50 p-3"><p className="font-display text-lg font-extrabold text-ink">{formatCount(counts.following)}</p><p className="text-xs text-muted">Following</p></div>
          </div>
        </div>
      </section>
      {blocked && <div className="glass border-error/40 bg-error/10 p-4 text-sm font-semibold text-error" role="status">You blocked {u.fullName}. They can no longer contact you. Manage blocked users in <Link className="underline" to="/blocked">Blocked</Link>.</div>}
      {message.isError && <p className="glass p-4 text-sm text-error" role="alert">Could not open the chat — you need a mutual match first.</p>}
      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-ink">Posts</h2>
        {myPosts.isLoading ? <LoadingList /> : posts.length === 0 ? <EmptyState icon={<UserRound className="h-6 w-6" />} title="No posts yet" body={isMe ? 'Share your first post with the community.' : `${u.fullName} hasn't posted anything yet.`} /> : posts.map((p) => <div key={p.id} className="mb-4"><PostCard post={p} /></div>)}
      </section>
      <p className="flex items-start gap-2 text-xs text-muted"><ShieldAlert className="h-4 w-4 shrink-0 text-success" /> Stay safe: never share passwords, money or private photos with someone you just met. Read our <Link className="font-semibold text-purple" to="/safety">Safety tips</Link>.</p>
      {blockOpen && (
        <Modal title={`Block ${u.fullName}?`} onClose={() => setBlockOpen(false)}>
          <p className="text-sm text-muted">Blocked people cannot message you, see your posts or appear in your matching. You can unblock them anytime from <Link className="font-semibold text-purple" to="/blocked">Blocked users</Link>.</p>
          <div className="mt-4 flex gap-2">
            <button className="btn-danger flex-1" disabled={block.isPending} onClick={() => block.mutate()}>{block.isPending ? <Spinner /> : 'Block user'}</button>
            <button className="btn-ghost flex-1" onClick={() => setBlockOpen(false)}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
