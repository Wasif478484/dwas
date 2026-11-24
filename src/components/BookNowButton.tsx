// C08 client island for the server-rendered technician profile.
"use client";

import { CalendarPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { t, type TranslationKey } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/use-lang";

export default function BookNowButton({ technicianId }: { technicianId: string }) {
  const lang = useLang();
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        const saved = window.sessionStorage;
        saved.setItem("dwas-selected-tech", technicianId);
        saved.removeItem("dwas-rebook");
        router.push("/client/booking/new");
      }}
      className="pressable group inline-flex min-h-11 items-center gap-2 self-start rounded-md bg-primary px-6 text-sm font-medium text-white"
    >
      <CalendarPlus
        aria-hidden="true"
        className="h-4 w-4 transition-transform duration-150 group-hover:scale-110 group-active:rotate-12"
      />
      {t(lang, "booking.bookNow" as TranslationKey)}
    </button>
  );
}
