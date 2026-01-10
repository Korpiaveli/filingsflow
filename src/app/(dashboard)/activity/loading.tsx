import { ActivityFeedSkeleton } from '@/components/ui/skeleton'

export default function ActivityLoading() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse space-y-2">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-5 w-64 bg-muted rounded" />
      </div>
      <ActivityFeedSkeleton count={10} />
    </div>
  )
}
