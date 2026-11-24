// D13: neutral placeholder block; the caller fixes its size via className.
export default function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-surface ${className}`} />;
}
