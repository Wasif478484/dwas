import Link from "next/link";
import DemoLogin from "@/components/DemoLogin";
import LanguageToggle from "@/components/LanguageToggle";
import { t } from "@/lib/i18n";

export default function Landing() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-8">
      <LanguageToggle />
      <DemoLogin />
      <div className="flex flex-col gap-4 text-center">
        <Link
          href="/client"
          className="rounded-lg bg-teal-600 px-8 py-4 text-lg font-medium text-white shadow transition-colors hover:bg-teal-700"
        >
          {t("en", "landing.client")}
        </Link>
        <Link
          href="/tech"
          className="rounded-lg bg-white px-8 py-4 text-lg font-medium text-teal-900 shadow transition-colors hover:bg-slate-50"
        >
          {t("en", "landing.tech")}
        </Link>
      </div>
    </div>
  );
}
