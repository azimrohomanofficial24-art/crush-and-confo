import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EyeOff, Heart, Plus, Send } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { TOPIC_CATEGORIES } from '../lib/types'
import { EmptyState, ErrorState, LoadingList, Spinner } from '../components/ui'
import { ConfessionCard } from '../components/feed'

export default function Confessions() {
  const [params, setParams] = useSearchParams()
  const topic = params.get('topic') || ''
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [anonymous, setAnonymous] = useState(true)
  const [selectedTopic, setSelectedTopic] = useState<string>('Love')
  const list = useQuery({ queryKey: ['confessions', topic], queryFn: () => api.confessions(topic || undefined) })
  const create = useMutation({
    mutationFn: () => api.createConfession(text.trim(), anonymous, selectedTopic),
    onSuccess: () => { setText(''); qc.invalidateQueries({ queryKey: ['confessions'] }) },
  })
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">Confessions</h1>
        <p className="text-sm text-muted">Say what your heart holds. Anonymous confessions never show your name publicly — be kind, and never share someone else's private information.</p>
      </div>
      <section className="glass p-5" aria-label="Write a confession">
        <h2 className="card-title flex items-center gap-2"><Plus className="h-5 w-5 text-pink" /> Share a confession</h2>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={2000} placeholder="What's on your heart? (max 2000 characters)" className="input mt-3 resize-none" aria-label="Your confession" />
        <p className="mt-1 text-right text-xs text-muted">{text.length}/2000</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-full bg-lavender/60 px-3 py-2 text-sm font-medium">
            <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="accent-purple" /> <EyeOff className="h-4 w-4" /> Post anonymously
          </label>
          <select value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)} className="rounded-full border border-lavender bg-white px-3 py-2 text-sm font-semibold" aria-label="Confession topic">
            {TOPIC_CATEGORIES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <button className="btn-gradient ml-auto" disabled={!text.trim() || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? <Spinner /> : <>Confess <Send className="h-4 w-4" /></>}
          </button>
        </div>
        {create.isError && <p className="mt-2 text-sm text-error">Could not post your confession. Please try again.</p>}
      </section>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by topic">
        <button onClick={() => setParams({})} className={!topic ? 'btn-gradient !min-h-[36px] !px-4 !py-1.5 text-xs' : 'btn-ghost !min-h-[36px] !px-4 !py-1.5 text-xs'}>All topics</button>
        {TOPIC_CATEGORIES.map((t) => (
          <button key={t} onClick={() => setParams({ topic: t })} className={topic === t ? 'btn-gradient !min-h-[36px] !px-4 !py-1.5 text-xs' : 'btn-ghost !min-h-[36px] !px-4 !py-1.5 text-xs'}>#{t}</button>
        ))}
      </div>
      {list.isLoading ? <LoadingList /> : list.isError ? <ErrorState message="Could not load confessions." onRetry={() => list.refetch()} /> : (list.data || []).length === 0 ? (
        <EmptyState icon={<Heart className="h-6 w-6" />} title="No confessions here yet" body="Be the first to share in this topic." />
      ) : (list.data || []).map((c) => <ConfessionCard key={c.id} confession={c} />)}
      <p className="text-center text-sm text-muted">Your confessions live at <Link className="font-semibold text-purple" to="/my-confessions">My Confessions</Link>.</p>
    </div>
  )
}
