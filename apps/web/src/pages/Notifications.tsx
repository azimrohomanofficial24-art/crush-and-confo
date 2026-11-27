import { Bell, CheckCheck, Heart, MessageCircle, UserPlus, Info } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, timeAgo } from '../lib/api'
import { EmptyState, ErrorState, LoadingList } from '../components/ui'

const ICONS: Record<string, typeof Heart> = { like: Heart, match: Heart, message: MessageCircle, comment: MessageCircle, follow: UserPlus, system: Info }

export default function Notifications() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const list = useQuery({ queryKey: ['notifications'], queryFn: () => api.notifications() })
  const markOne = useMutation({ mutationFn: (id: string) => api.markNotificationRead(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }) })
  const markAll = useMutation({ mutationFn: () => api.markAllNotificationsRead(), onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }) })
  const sayHello = useMutation({
    mutationFn: (matchId: string) => api.startConversation(matchId),
    onSuccess: (conv) => navigate(`/messages?active=${conv.id}`),
  })
  const unread = (list.data || []).filter((n) => !n.read).length
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">Notifications</h1>
          <p className="text-sm text-muted">{unread} unread notification{unread === 1 ? '' : 's'}</p>
        </div>
        <button className="btn-ghost" disabled={unread === 0 || markAll.isPending} onClick={() => markAll.mutate()}><CheckCheck className="h-4 w-4" /> Mark all as read</button>
      </div>
      {list.isLoading ? <LoadingList /> : list.isError ? <ErrorState message="Could not load notifications." onRetry={() => list.refetch()} /> : (list.data || []).length === 0 ? (
        <EmptyState icon={<Bell className="h-6 w-6" />} title="All caught up" body="New likes, matches and messages will appear here." />
      ) : (
        <div className="space-y-3">
          {(list.data || []).map((n) => {
            const Icon = ICONS[n.type] || Info
            const matchId = n.data && typeof n.data.matchId === 'string' ? n.data.matchId : null
            return (
              <div key={n.id} className={`glass flex items-start gap-3 p-4 ${n.read ? 'opacity-75' : ''}`}>
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${n.type === 'like' || n.type === 'match' ? 'bg-pink/10 text-pink' : 'bg-lavender text-purple'}`}>
                  <Icon className={`h-5 w-5 ${n.type === 'like' || n.type === 'match' ? 'fill-pink' : ''}`} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{n.title}</p>
                  <p className="text-sm text-muted">{n.body}</p>
                  <p className="mt-1 text-xs text-muted">{timeAgo(n.createdAt)}</p>
                  {n.type === 'match' && matchId && (
                    <button onClick={() => sayHello.mutate(matchId)} disabled={sayHello.isPending} className="btn-gradient mt-2 !min-h-[36px] !px-4 !py-1.5 text-xs">Say hello</button>
                  )}
                </div>
                {!n.read && <button onClick={() => markOne.mutate(n.id)} className="shrink-0 rounded-full bg-pink/10 px-3 py-1.5 text-xs font-semibold text-pink hover:bg-pink/20">Mark read</button>}
              </div>
            )
          })}
        </div>
      )}
      <p className="text-center text-sm text-muted">Notifications for likes, matches, messages and comments are on. Manage your account in <Link className="font-semibold text-purple" to="/settings">Settings</Link>.</p>
    </div>
  )
}
