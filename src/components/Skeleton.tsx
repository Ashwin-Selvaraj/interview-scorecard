export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-[#21262d] ${className}`} />
  );
}

export function SkeletonText({ lines = 1, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"}`}
        />
      ))}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <tr className="border-b border-[#21262d]">
      <td className="px-5 py-3.5"><Skeleton className="h-3.5 w-28" /></td>
      <td className="px-5 py-3.5"><Skeleton className="h-3.5 w-36" /></td>
      <td className="px-5 py-3.5"><Skeleton className="h-3.5 w-10" /></td>
      <td className="px-5 py-3.5"><Skeleton className="h-3.5 w-40" /></td>
      <td className="px-5 py-3.5"><Skeleton className="h-5 w-20 rounded-full" /></td>
      <td className="px-5 py-3.5"><Skeleton className="h-3.5 w-20" /></td>
      <td className="px-5 py-3.5"><Skeleton className="h-3.5 w-10" /></td>
    </tr>
  );
}

export function SkeletonRoleCard() {
  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5 flex items-start justify-between gap-4">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-72" />
        <Skeleton className="h-3 w-32 mt-2" />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Skeleton className="h-7 w-14 rounded-lg" />
        <Skeleton className="h-7 w-20 rounded-lg" />
        <Skeleton className="h-7 w-16 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
      <Skeleton className="h-8 w-12 mb-2" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}

export function SkeletonRound() {
  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#21262d] bg-[#1c2128]">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-4 w-8" />
      </div>
      <div className="px-5 py-5 space-y-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border-t border-[#21262d] pt-4 space-y-3">
            <SkeletonText lines={2} />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((j) => (
                <Skeleton key={j} className="h-7 w-20 rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
