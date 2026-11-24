import Skeleton from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="flex min-h-screen flex-1 flex-col gap-6 px-4 py-6">
      <Skeleton className="h-9 w-48" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-24 rounded-md" />
        <Skeleton className="h-24 rounded-md" />
        <Skeleton className="h-24 rounded-md" />
        <Skeleton className="h-24 rounded-md" />
      </div>
      <Skeleton className="h-40 rounded-md" />
      <Skeleton className="h-40 rounded-md" />
      <Skeleton className="h-40 rounded-md" />
    </main>
  );
}
