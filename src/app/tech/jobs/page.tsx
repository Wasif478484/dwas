// Spec T03: requested jobs for this technician, live from Firestore when configured.
"use client";

import { collection, getFirestore, onSnapshot, query, where } from "firebase/firestore";
import Link from "next/link";
import { Suspense, use, useEffect, useState } from "react";
import TechJobCard from "@/components/TechJobCard";
import { technicianAuthHeaders, useTechnicianId } from "@/components/useTechnicianId";
import { getFirebaseApp } from "@/lib/firebase/client";
import { t as baseT, type Lang, type TranslationKey } from "@/lib/i18n";

// Keys are added to the shared dictionaries by the i18n owner.
const t = (lang: Lang, key: string): string => baseT(lang, key as TranslationKey);
import { useLang } from "@/lib/i18n/use-lang";
import type { BookingDoc, GeoPoint, TechnicianDoc } from "@/lib/types";

type JobsProps = { searchParams: Promise<{ view?: string | string[] | undefined }> };

export default function TechJobsPage(props: JobsProps) {
  return (
    <Suspense fallback={<p className="p-4 text-ink-muted">{t("en", "tech.loading")}</p>}>
      <JobsView {...props} />
    </Suspense>
  );
}

function JobsView({ searchParams }: JobsProps) {
  const { view } = use(searchParams);
  const current = view === "current";
  const lang = useLang();
  const other = lang === "ur" ? "en" : "ur";
  const techId = useTechnicianId();
  const [bookings, setBookings] = useState<BookingDoc[]>([]);
  const [center, setCenter] = useState<GeoPoint | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!techId) return;
    let active = true;
    void technicianAuthHeaders()
      .then((headers) => fetch("/api/technicians/me", { headers }))
      .then((res) => (res.ok ? res.json() : null))
      .then((data: TechnicianDoc | null) => {
        if (active && data?.center) setCenter(data.center);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [techId]);

  useEffect(() => {
    if (!techId) return;
    if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const db = getFirestore(getFirebaseApp());
    const q = current
      ? query(collection(db, "bookings"), where("technicianId", "==", techId), where("status", "in", ["accepted", "on_the_way", "in_progress"]))
      : query(collection(db, "bookings"), where("technicianId", "==", techId), where("status", "==", "requested"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setBookings(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as BookingDoc)));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, [techId, current]);

  const title = current ? "tech.jobs.currentTitle" : "tech.jobs.title";
  const configured = Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);

  return (
    <main dir={lang === "ur" ? "rtl" : "ltr"} className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-display font-semibold text-ink">{t(lang, title)}</h1>
          <p className="text-sm text-ink-muted">{t(other, title)}</p>
        </div>
        <Link
          href={current ? "/tech/jobs" : "/tech/jobs?view=current"}
          className="flex min-h-14 items-center rounded-pill border border-hairline bg-surface px-4 text-sm font-medium text-ink"
        >
          {t(lang, current ? "tech.jobs.newJobs" : "tech.jobs.myJobs")}
        </Link>
      </header>

      {!configured ? (
        <p className="rounded-md border border-hairline bg-surface p-4 text-ink-muted">{t(lang, "tech.jobs.demoEmpty")}</p>
      ) : loading || !techId ? (
        <p className="p-4 text-ink-muted">{t(lang, "tech.loading")}</p>
      ) : bookings.length === 0 ? (
        <p className="rounded-md border border-hairline bg-surface p-4 text-ink-muted">{t(lang, "tech.jobs.empty")}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {bookings.map((booking) => (
            <TechJobCard key={booking.id} booking={booking} technicianCenter={center} onChanged={() => undefined} />
          ))}
        </div>
      )}
    </main>
  );
}
