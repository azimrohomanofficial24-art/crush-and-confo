import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'
import { api } from '../lib/api'
import { EmptyState, ErrorState, LoadingList } from '../components/ui'
import { CreatePostCard, PostCard } from '../components/feed'

export default function Community() {
  const feed = useQuery({ queryKey: ['feed'], queryFn: () => api.feed() })
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">Community</h1>
        <p className="text-sm text-muted">Posts, stories and conversations from people around you. Be kind — reports are reviewed by moderators.</p>
      </div>
      <CreatePostCard />
      {feed.isLoading ? <LoadingList /> : feed.isError ? <ErrorState message="Could not load the community feed." onRetry={() => feed.refetch()} /> : (feed.data || []).length === 0 ? (
        <EmptyState icon={<Users className="h-6 w-6" />} title="The community is quiet" body="Start the conversation with your first post." />
      ) : (feed.data || []).map((p) => <PostCard key={p.id} post={p} />)}
      <p className="text-center text-sm text-muted">See something that breaks the rules? Use Report on any post — or read the <Link className="font-semibold text-purple" to="/guidelines">Community Guidelines</Link>.</p>
    </div>
  )
}
