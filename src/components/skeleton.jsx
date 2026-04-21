/**
 * Skeleton loading primitives.
 * Reusable building blocks for shimmer-loading states.
 */

/** Base shimmer bar */
export function SkeletonBar({ className = "" }) {
  return (
    <div
      className={`rounded-lg bg-white/5 animate-pulse ${className}`}
    />
  );
}

/** Stat card skeleton */
export function SkeletonStatCard() {
  return (
    <div className="rounded-2xl border border-white/6 bg-[#0F1729] p-5 space-y-3">
      <SkeletonBar className="h-3 w-24" />
      <SkeletonBar className="h-8 w-20" />
      <SkeletonBar className="h-2 w-32" />
    </div>
  );
}

/** Dashboard card skeleton (title + 3 list rows) */
export function SkeletonDashCard({ rows = 3 }) {
  return (
    <div className="rounded-2xl border border-white/6 bg-[#0F1729] p-5 space-y-4">
      <div className="flex justify-between items-center">
        <SkeletonBar className="h-4 w-36" />
        <SkeletonBar className="h-3 w-16" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonListRow key={i} />
      ))}
    </div>
  );
}

/** Single list row skeleton */
export function SkeletonListRow() {
  return (
    <div className="flex items-center justify-between rounded-xl bg-[#0A1020] px-4 py-3">
      <div className="space-y-2">
        <SkeletonBar className="h-3.5 w-28" />
        <SkeletonBar className="h-2.5 w-40" />
      </div>
      <SkeletonBar className="h-6 w-16 rounded-full" />
    </div>
  );
}

/** Progress ring placeholder */
export function SkeletonRing({ size = 120 }) {
  return (
    <div
      className="rounded-full bg-white/5 animate-pulse"
      style={{ width: size, height: size }}
    />
  );
}

/** Greeting card skeleton */
export function SkeletonGreeting() {
  return (
    <div className="rounded-2xl border border-white/6 bg-[#0F1729] p-5 space-y-3 min-h-50">
      <SkeletonBar className="h-3 w-24" />
      <SkeletonBar className="h-9 w-36" />
      <SkeletonBar className="h-9 w-28" />
    </div>
  );
}

/** Chat message skeleton */
export function SkeletonMessage({ align = "left" }) {
  return (
    <div className={`flex ${align === "right" ? "justify-end" : "justify-start"}`}>
      <div className={`space-y-2 ${align === "right" ? "items-end" : "items-start"} flex flex-col`}>
        <SkeletonBar className="h-3 w-16" />
        <SkeletonBar className={`h-10 ${align === "right" ? "w-48" : "w-56"} rounded-2xl`} />
      </div>
    </div>
  );
}

/** Full availability grid skeleton */
export function SkeletonAvailability() {
  return (
    <div className="rounded-2xl border border-white/6 bg-[#0F1729] p-5 space-y-3">
      <div className="flex justify-between items-center">
        <SkeletonBar className="h-4 w-24" />
        <SkeletonBar className="h-3 w-20" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="grid grid-cols-8 gap-1">
          <SkeletonBar className="h-6" />
          {Array.from({ length: 7 }).map((_, j) => (
            <SkeletonBar key={j} className="h-6" />
          ))}
        </div>
      ))}
    </div>
  );
}
