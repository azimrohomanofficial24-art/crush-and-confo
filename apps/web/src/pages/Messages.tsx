import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Send, ShieldAlert } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, timeAgo } from '../lib/api'
import { CURRENT_USER_ID } from '../lib/demoData'
import { Avatar, EmptyState, ErrorState, LoadingList, Spinner } from '../components/ui'

export default function Messages() {
  const qc = useQueryClient()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [text, setText] = useState('')
  const convs = useQuery({ queryKey: ['conversations'], queryFn: () => api.conversations() })
  const active = (convs.data || []).find((c) => c.id === activeId) || (convs.data || [])[0]
  const msgs = useQuery({ queryKey: ['messages', active?.id], queryFn: () => api.messages(active!.id), enabled: !!active })
  useEffect(() => {
    if (active) api.markConversationRead(active.id).then(() => qc.invalidateQueries({ queryKey: ['conversations'] }))
  }, [active?.id])
  const send = useMutation({
    mutationFn: () => api.sendMessage(active!.id, text.trim()),
    onSuccess: () => { setText(''); qc.invalidateQueries({ queryKey: ['messages', active!.id] }); qc.invalidateQueries({ queryKey: ['conversations'] }) },
  })
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">Messages</h1>
        <p className="flex items-center gap-1.5 text-sm text-muted"><ShieldAlert className="h-4 w-4 text-success" /> Chat opens only after a mutual match. Be respectful — harassment is never okay.</p>
      </div>
      {convs.isLoading ? <LoadingList /> : convs.isError ? <ErrorState message="Could not load conversations." onRetry={() => convs.refetch()} /> : (convs.data || []).length === 0 ? (
        <EmptyState icon={<Mail className="h-6 w-6" />} title="No conversations yet" body="Like people in Matching — when someone likes you back, you can chat here." action={<Link to="/matching" className="btn-gradient">Find matches</Link>} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <section className="glass divide-y divide-lavender/60 overflow-hidden" aria-label="Conversations">
            {(convs.data || []).map((c) => (
              <button key={c.id} onClick={() => setActiveId(c.id)} className={`flex w-full items-center gap-3 p-4 text-left transition hover:bg-lavender/30 ${active?.id === c.id ? 'bg-lavender/40' : ''}`}>
                <Avatar user={c.otherUser} size={48} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2"><span className="truncate font-semibold text-ink">{c.otherUser.fullName}</span><span className="shrink-0 text-[11px] text-muted">{timeAgo(c.lastMessageAt)}</span></span>
                  <span className="block truncate text-sm text-muted">{c.lastMessage}</span>
                </span>
                {c.unread > 0 && <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pink text-[10px] font-bold text-white">{c.unread}</span>}
              </button>
            ))}
          </section>
          <section className="glass flex min-h-[420px] flex-col p-4 sm:p-5" aria-label="Chat">
            {active ? (
              <>
                <div className="flex items-center gap-3 border-b border-lavender/60 pb-3">
                  <Link to={`/profile/${active.otherUser.username}`}><Avatar user={active.otherUser} size={44} /></Link>
                  <div className="flex-1">
                    <Link to={`/profile/${active.otherUser.username}`} className="font-semibold text-ink hover:text-purple">{active.otherUser.fullName}</Link>
                    <p className="text-xs text-muted">{active.otherUser.online ? 'Online now' : 'Offline'} · Matched {timeAgo(active.matchedAt)}</p>
                  </div>
                  <Link to={`/profile/${active.otherUser.username}`} className="btn-ghost !min-h-[36px] !px-3 !py-1.5 text-xs">View profile</Link>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto py-4" aria-live="polite">
                  {msgs.isLoading ? <p className="text-sm text-muted">Loading messages…</p> : (msgs.data || []).map((m) => {
                    const mine = m.senderId === CURRENT_USER_ID
                    return (
                      <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-3xl px-4 py-2.5 text-sm ${mine ? 'rounded-br-md bg-gradient-to-r from-pink to-purple text-white' : 'rounded-bl-md bg-lavender/60 text-ink'}`}>
                          {m.text}
                          <span className={`mt-1 block text-right text-[10px] ${mine ? 'text-white/70' : 'text-muted'}`}>{timeAgo(m.createdAt)}{mine ? (m.read ? ' · Read' : ' · Sent') : ''}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <form className="flex gap-2 border-t border-lavender/60 pt-3" onSubmit={(e) => { e.preventDefault(); if (text.trim()) send.mutate() }}>
                  <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message ${active.otherUser.fullName}…`} className="input" aria-label="Message text" />
                  <button type="submit" disabled={!text.trim() || send.isPending} className="btn-gradient !px-4" aria-label="Send message">{send.isPending ? <Spinner /> : <Send className="h-4 w-4" />}</button>
                </form>
                {send.isError && <p className="mt-2 text-sm text-error">Message could not be sent. Please try again.</p>}
              </>
            ) : <p className="m-auto text-sm text-muted">Select a conversation to start chatting.</p>}
          </section>
        </div>
      )}
    </div>
  )
}
