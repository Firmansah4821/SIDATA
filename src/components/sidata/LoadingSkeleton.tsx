export function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-muted" />
        <div className="space-y-2">
          <div className="h-5 w-40 bg-muted rounded" />
          <div className="h-3 w-56 bg-muted rounded" />
        </div>
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div className="flex justify-between">
              <div className="w-9 h-9 rounded-lg bg-muted" />
              <div className="w-4 h-4 rounded bg-muted" />
            </div>
            <div className="h-7 w-12 bg-muted rounded" />
            <div className="h-3 w-20 bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="bg-card rounded-xl border border-border p-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-48 h-48 rounded-full bg-muted mx-auto" />
          <div className="flex-1 space-y-4">
            <div className="h-3 w-24 bg-muted rounded" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-muted" />
                <div className="h-3 flex-1 bg-muted rounded" />
                <div className="h-3 w-8 bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex justify-between items-center">
        <div className="h-6 w-48 bg-muted rounded" />
        <div className="h-10 w-36 bg-muted rounded-xl" />
      </div>
      <div className="h-10 w-full bg-muted rounded-xl" />
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="space-y-0">
          <div className="h-12 bg-muted/50 border-b border-border" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 border-b border-border/50 px-4 flex items-center gap-4">
              <div className="h-4 w-8 bg-muted rounded" />
              <div className="h-4 flex-1 bg-muted rounded" />
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="h-4 w-24 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-muted" />
        <div className="space-y-2">
          <div className="h-5 w-48 bg-muted rounded" />
          <div className="h-3 w-64 bg-muted rounded" />
        </div>
      </div>
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex gap-6">
          <div className="w-24 h-24 rounded-full bg-muted" />
          <div className="flex-1 space-y-4">
            <div className="h-10 bg-muted rounded-lg" />
            <div className="h-10 bg-muted rounded-lg" />
            <div className="h-10 w-40 bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
