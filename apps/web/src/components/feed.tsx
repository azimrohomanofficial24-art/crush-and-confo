import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, Flag, Heart, MapPin, MessageCircle, Send, Smile, X } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, formatCount, timeAgo } from '../lib/api'
import { Avatar, Modal, Spinner } from './ui'
import type { Confession, Post } from '../lib/types'

function ReportButton({ targetId, targetType, kind }: { targetId: string; targetType: 'user' | 'post' | 'confession'; kind: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('Inappropriate content')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const submit = async () => {
    setError('')
    try { await api.report(targetId, targetType, reason); setDone(true); setTimeout(() => { setOpen(false); setDone(false) }, 1200) }
    catch { setError('Could not send the report. Please try again.') }
  }
  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-medium text-muted hover:bg-error/10 hover:text-error" aria-label={`Report this ${kind}`}>
        <Flag className="h-4 w-4" /> Report
      </button>
      {open && (
        <Modal title={`Report ${kind}`} onClose={() => setOpen(false)}>
          {done ? <p className="text-sm text-success font-semibold">Thank you — our moderation team will review this report.</p> : (
            <>
              <label className="label" htmlFor="report-reason">Reason</label>
              <select id="report-reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
                {['Inappropriate content', 'Harassment or bullying', 'Spam', 'Impersonation', 'Something else'].map((r) => <option key={r}>{r}</option>)}
              </select>
              {error && <p className="mt-2 text-sm text-error" role="alert">{error}</p>}
              <button className="btn-gradient mt-4 w-full" onClick={submit}>Submit report</button>
            </>
          )}
        </Modal>
      )}
    </>
  )
}

export function CommentSection({ kind, postId, initialCount }: { kind: 'post' | 'confession'; postId: string; initialCount: number }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const { data: comments = [], isLoading } = useQuery({ queryKey: ['comments', kind, postId], queryFn: () => api.getComments(kind, postId), enabled: open })
  const add = useMutation({
    mutationFn: () => api.addComment(kind, postId, text.trim()),
    onSuccess: () => { setText(''); qc.invalidateQueries({ queryKey: ['comments', kind, postId] }); qc.invalidateQueries({ queryKey: ['feed'] }); qc.invalidateQueries({ queryKey: ['confessions'] }) },
  })
  return (
    <div className="mt-3 border-t border-lavender/50 pt-3">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-purple">
        <MessageCircle className="h-4 w-4" /> {initialCount} comments {open ? '— hide' : ''}
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          {isLoading ? <p className="text-sm text-muted">Loading comments…</p> : comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <Avatar user={c.author} size={32} />
              <div className="rounded-2xl bg-lavender/50 px-3 py-2 text-sm"><span className="font-semibold">{c.author.fullName}</span> <span className="text-muted text-xs">· {timeAgo(c.createdAt)}</span><p>{c.text}</p></div>
            </div>
          ))}
          {comments.length === 0 && !isLoading && <p className="text-sm text-muted">No comments yet — be the first to reply kindly.</p>}
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) add.mutate() }}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a kind comment…" className="input !py-2.5" aria-label="Write a comment" />
            <button type="submit" disabled={!text.trim() || add.isPending} className="btn-gradient !px-4">{add.isPending ? <Spinner /> : <Send className="h-4 w-4" />}</button>
          </form>
          {add.isError && <p className="text-sm text-error">Could not post the comment. Please try again.</p>}
        </div>
      )}
    </div>
  )
}

export function PostCard({ post }: { post: Post }) {
  const qc = useQueryClient()
  const like = useMutation({ mutationFn: () => api.togglePostLike(post.id, post.likedByMe), onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }) })
  const save = useMutation({ mutationFn: () => api.togglePostSave(post.id, post.savedByMe), onSuccess: () => { qc.invalidateQueries({ queryKey: ['feed'] }); qc.invalidateQueries({ queryKey: ['saved'] }) } })
  return (
    <article className="glass p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <Link to={`/profile/${post.author.username}`}><Avatar user={post.author} size={44} /></Link>
        <div className="min-w-0 flex-1">
          <Link to={`/profile/${post.author.username}`} className="font-semibold text-ink hover:text-purple">{post.author.fullName}</Link>
          <p className="text-xs text-muted">@{post.author.username} · {timeAgo(post.createdAt)}</p>
        </div>
        {post.feeling && <span className="chip hidden sm:inline-flex"><Smile className="h-3 w-3" /> {post.feeling}</span>}
      </div>
      <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-ink/90">{post.content}</p>
      {post.imageUrl && <img src={post.imageUrl} alt="" loading="lazy" className="mt-3 max-h-96 w-full rounded-2xl object-cover" />}
      {(post.location || post.hashtag) && (
        <p className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
          {post.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {post.location}</span>}
          {post.hashtag && <span className="font-semibold text-purple">{post.hashtag}</span>}
        </p>
      )}
      <div className="mt-3 flex items-center gap-1 border-t border-lavender/50 pt-3">
        <button onClick={() => like.mutate()} disabled={like.isPending} className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition ${post.likedByMe ? 'text-pink' : 'text-muted hover:bg-pink/10 hover:text-pink'}`} aria-label={post.likedByMe ? 'Unlike post' : 'Like post'}>
          <Heart className={`h-5 w-5 ${post.likedByMe ? 'fill-pink text-pink' : ''}`} /> {formatCount(post.likes)}
        </button>
        <button onClick={() => save.mutate()} disabled={save.isPending} className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition ${post.savedByMe ? 'text-purple' : 'text-muted hover:bg-purple/10 hover:text-purple'}`} aria-label={post.savedByMe ? 'Remove from saved' : 'Save post'}>
          <Bookmark className={`h-5 w-5 ${post.savedByMe ? 'fill-purple text-purple' : ''}`} /> {post.savedByMe ? 'Saved' : 'Save'}
        </button>
        <span className="ml-auto"><ReportButton targetId={post.id} targetType="post" kind="post" /></span>
      </div>
      <CommentSection kind="post" postId={post.id} initialCount={post.comments} />
    </article>
  )
}

export function ConfessionCard({ confession }: { confession: Confession }) {
  const qc = useQueryClient()
  const like = useMutation({ mutationFn: () => api.toggleConfessionLike(confession.id, confession.likedByMe), onSuccess: () => qc.invalidateQueries({ queryKey: ['confessions'] }) })
  const save = useMutation({ mutationFn: () => api.toggleConfessionSave(confession.id, confession.savedByMe), onSuccess: () => { qc.invalidateQueries({ queryKey: ['confessions'] }); qc.invalidateQueries({ queryKey: ['saved'] }) } })
  return (
    <article className="glass p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lavender text-lg font-bold text-purple">”</span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-relaxed text-ink/90">{confession.text}</p>
          <p className="mt-2 text-xs text-muted">{confession.anonymous ? 'Anonymous' : confession.authorName} · {timeAgo(confession.createdAt)} · <span className="chip !py-0.5">{confession.topic}</span></p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1 border-t border-lavender/50 pt-3">
        <button onClick={() => like.mutate()} disabled={like.isPending} className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition ${confession.likedByMe ? 'text-pink' : 'text-muted hover:bg-pink/10 hover:text-pink'}`} aria-label="Like confession">
          <Heart className={`h-5 w-5 ${confession.likedByMe ? 'fill-pink text-pink' : ''}`} /> {formatCount(confession.likes)}
        </button>
        <button onClick={() => save.mutate()} disabled={save.isPending} className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition ${confession.savedByMe ? 'text-purple' : 'text-muted hover:bg-purple/10 hover:text-purple'}`} aria-label="Save confession">
          <Bookmark className={`h-5 w-5 ${confession.savedByMe ? 'fill-purple text-purple' : ''}`} /> {confession.savedByMe ? 'Saved' : 'Save'}
        </button>
        <span className="ml-auto"><ReportButton targetId={confession.id} targetType="confession" kind="confession" /></span>
      </div>
      <CommentSection kind="confession" postId={confession.id} initialCount={confession.comments} />
    </article>
  )
}

export function CreatePostCard() {
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [feeling, setFeeling] = useState('')
  const [location, setLocation] = useState('')
  const [showOptions, setShowOptions] = useState(false)
  const [visibility, setVisibility] = useState('Public')
  const create = useMutation({
    mutationFn: () => api.createPost(text.trim(), { feeling: feeling || undefined, location: location || undefined, visibility }),
    onSuccess: () => { setText(''); setFeeling(''); setLocation(''); setShowOptions(false); qc.invalidateQueries({ queryKey: ['feed'] }) },
  })
  return (
    <section className="glass p-4 sm:p-5" aria-label="Create post">
      <div className="flex items-center justify-between gap-2">
        <h2 className="card-title">Create Post</h2>
        <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="rounded-full border border-lavender bg-white px-3 py-1.5 text-xs font-semibold" aria-label="Post visibility">
          <option>Public</option><option>Friends</option><option>Only me</option>
        </select>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={2000} placeholder="Share what's on your mind… (add #hashtags to join a topic)" className="input mt-3 resize-none" aria-label="Post content" />
      {showOptions && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input value={feeling} onChange={(e) => setFeeling(e.target.value)} placeholder="Feeling (e.g. Happy)" className="input" aria-label="Feeling" />
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (e.g. Dhaka)" className="input" aria-label="Location" />
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button className="btn-ghost !min-h-[40px] !px-3.5 !py-2 text-xs" onClick={() => setShowOptions((s) => !s)}><Smile className="h-4 w-4 text-warning" /> Feeling</button>
        <button className="btn-ghost !min-h-[40px] !px-3.5 !py-2 text-xs" onClick={() => setShowOptions((s) => !s)}><MapPin className="h-4 w-4 text-purple" /> Location</button>
        <button className="btn-gradient ml-auto" disabled={!text.trim() || create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? <Spinner /> : <>Post <Send className="h-4 w-4" /></>}
        </button>
      </div>
      {create.isError && <p className="mt-2 text-sm text-error">Could not post. Please try again.</p>}
      <p className="mt-2 text-[11px] text-muted">Posting as {visibility.toLowerCase()}. Friends sees followers only; Only me is private to you.</p>
    </section>
  )
}

export function FollowButton({ userId, initialFollowing }: { userId: string; initialFollowing: boolean }) {
  const qc = useQueryClient()
  const [following, setFollowing] = useState(initialFollowing)
  const m = useMutation({ mutationFn: () => api.follow(userId), onSuccess: (now) => { setFollowing(now); qc.invalidateQueries({ queryKey: ['following'] }); qc.invalidateQueries({ queryKey: ['followers'] }) } })
  return (
    <button onClick={() => m.mutate()} disabled={m.isPending} className={following ? 'btn-ghost !min-h-[36px] !px-4 !py-1.5 text-xs' : 'btn-gradient !min-h-[36px] !px-4 !py-1.5 text-xs'}>
      {m.isPending ? <Spinner /> : following ? 'Following' : 'Follow'}
    </button>
  )
}

export function CloseButton({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="rounded-full p-1.5 hover:bg-lavender/60" aria-label="Close"><X className="h-4 w-4" /></button>
}
