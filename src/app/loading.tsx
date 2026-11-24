import Skeleton from "@/components/Skeleton";

// Root fallback: mirrors the shared LangDir shell (max-w-2xl, px-4 py-6, gap-4).
export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-14 w-full rounded-lg" />
      <Skeleton className="h-40 w-full rounded-lg" />
    </div>
  );
}
