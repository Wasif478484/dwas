// DWAS C07 — technician profile. Data is read server-side from Firestore;
// hidden reviews are excluded at query time and never rendered.
import Link from "next/link";
import BookNowButton from "@/components/BookNowButton";
import { BadgeLabel, LangDir, LocalizedText, T } from "@/components/TechCard";
import { AREAS } from "@/lib/areas";
import { db } from "@/lib/firebase/admin";
import type { ReviewDoc } from "@/lib/types";

// Server-side Firestore reads are runtime data (Next 16 cache components).
export const instant = false;

export default async function TechnicianPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const snap = await db.collection("technicians").doc(id).get();
  if (!snap.exists) {
    return (
      <LangDir>
        <h1 className="text-display font-display text-ink"><T k="tech.notFound" /></h1>
        <Link href="/client/results" className="self-start text-sm text-primary hover:underline">
          <T k="tech.back" />
        </Link>
      </LangDir>
    );
  }

  const tech = snap.data();
  const reviewsSnap = await db
    .collection("reviews")
    .where("technicianId", "==", id)
    .where("hidden", "==", false)
    .get();
  const reviews = reviewsSnap.docs
    .map((doc) => doc.data() as ReviewDoc)
    .sort((a, b) => Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0))
    .slice(0, 5);

  const stats = tech?.stats;
  const ratingCount = stats?.ratingCount ?? 0;
  const ratingAvg = ratingCount > 0
    ? Math.round(((stats?.ratingSum ?? 0) / ratingCount) * 10) / 10
    : null;
  const areaId = tech?.center?.areaId;
  const areaName = AREAS.find((a) => a.id === areaId)?.name ?? areaId;
  const badges: string[] = tech?.badges ?? [];
  const workPhotos: string[] = tech?.workPhotos ?? [];

  return (
    <LangDir>
      <Link href="/client/results" className="self-start text-sm text-primary hover:underline">
        <T k="tech.back" />
      </Link>

      <div className="flex gap-4 rounded-md border border-hairline bg-background p-4">
        {tech?.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tech.photoUrl} alt="" className="h-20 w-20 shrink-0 rounded-md bg-surface object-cover" />
        )}
        <div className="min-w-0">
          <h1 className="text-display font-display text-ink">{tech?.name}</h1>
          <p className="text-sm text-ink-muted">
            {tech?.yearsExperience ?? 0} <T k="tech.experience" />
          </p>
          <p className="text-sm text-ink-muted">
            <T k={tech?.isOnline ? "tech.online" : "tech.offline"} />
          </p>
          <p className="mt-1 text-sm font-medium text-ink">
            ★ {ratingAvg ?? "—"} · {ratingCount} <T k="tech.ratings" /> · {stats?.jobsCompleted ?? 0} <T k="tech.jobsCompleted" />
          </p>
        </div>
      </div>

      <BookNowButton technicianId={id} />

      {badges.length > 0 && (
        <section className="flex flex-col gap-2 rounded-md border border-hairline bg-background p-4">
          <h2 className="text-title font-display text-ink"><T k="tech.badges" /></h2>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <span key={badge} className="rounded-pill bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <BadgeLabel badge={badge} />
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2 rounded-md border border-hairline bg-background p-4">
        <h2 className="text-title font-display text-ink"><T k="tech.about" /></h2>
        <p className="text-sm text-ink-muted">
          <LocalizedText en={tech?.bio_en} ur={tech?.bio_ur} />
          {!tech?.bio_en && !tech?.bio_ur ? <T k="tech.noBio" /> : null}
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          <T k="tech.serviceAreas" />: {areaName ?? <T k="tech.areaUnknown" />}
        </p>
      </section>

      {workPhotos.length > 0 && (
        <section className="flex flex-col gap-2 rounded-md border border-hairline bg-background p-4">
          <h2 className="text-title font-display text-ink"><T k="tech.workPhotos" /></h2>
          <div className="flex flex-wrap gap-2">
            {workPhotos.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt="" loading="lazy" className="h-24 w-24 rounded-md bg-surface object-cover" />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2 rounded-md border border-hairline bg-background p-4">
        <h2 className="text-title font-display text-ink"><T k="tech.reviews" /></h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-ink-muted"><T k="tech.noReviews" /></p>
        ) : (
          <ul className="flex flex-col gap-3">
            {reviews.map((review) => (
              <li key={review.bookingId} className="rounded-md bg-surface p-3">
                <p className="text-sm text-primary" aria-label={`${review.stars} / 5`}>{"★".repeat(review.stars)}</p>
                {review.comment && (
                  <p className="mt-1 text-sm text-ink">
                    <LocalizedText en={review.comment} ur={review.comment} />
                  </p>
                )}
                {review.tags.length > 0 && (
                  <p className="mt-1 text-xs text-ink-muted">{review.tags.join(" · ")}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </LangDir>
  );
}
