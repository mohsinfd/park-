const CardSkeleton = () => (
  <div className="rounded-xl border border-border bg-card p-5 space-y-4 overflow-hidden relative">
    {/* Shimmer overlay */}
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-muted-foreground/5 to-transparent animate-shimmer-loading" />
    </div>
    <div className="flex gap-3">
      <div className="w-20 h-5 rounded-full bg-muted animate-pulse" />
    </div>
    <div className="space-y-2">
      <div className="w-3/4 h-5 rounded bg-muted animate-pulse" />
      <div className="w-1/3 h-4 rounded bg-muted animate-pulse" />
    </div>
    <div className="flex gap-2">
      <div className="w-16 h-6 rounded-full bg-muted animate-pulse" />
      <div className="w-20 h-6 rounded-full bg-muted animate-pulse" />
    </div>
    <div className="grid grid-cols-3 gap-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-1">
          <div className="w-full h-3 rounded bg-muted animate-pulse" />
          <div className="w-2/3 h-5 rounded bg-muted animate-pulse" />
        </div>
      ))}
    </div>
    <div className="flex justify-end">
      <div className="w-28 h-10 rounded-lg bg-muted animate-pulse" />
    </div>
  </div>
);

export default CardSkeleton;
