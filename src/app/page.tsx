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
          className="pressable rounded-lg bg-primary px-8 py-4 text-lg font-medium text-white hover:bg-primary-hover"
        >
          {t("en", "landing.client")}
        </Link>
        <Link
          href="/tech"
          className="pressable rounded-lg border border-hairline bg-background px-8 py-4 text-lg font-medium text-ink hover:bg-surface"
        >
          {t("en", "landing.tech")}
        </Link>
      </div>
    </div>
  );
}
