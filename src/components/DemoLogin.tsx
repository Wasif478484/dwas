// Demo-only sign-in (A01). Never presents the mocked code as real verification.
"use client";

import { useState, type FormEvent } from "react";
import { t, type TranslationKey } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/use-lang";
import type { Role } from "@/lib/types";

const ROLES: Role[] = ["client", "technician", "admin"];

export default function DemoLogin() {
  const lang = useLang();
  const txt = (key: string) => t(lang, key as TranslationKey);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("123456");
  const [role, setRole] = useState<Role>("client");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch("/api/auth/mock-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, code, role }),
      });
      const result: { token?: string; uid?: string; error?: { message?: string } } = await response.json();
      if (!response.ok || !result.token || !result.uid) {
        setStatus(txt("admin.demo.failure"));
        return;
      }
      window.localStorage.setItem("dwas-demo-token", result.token);
      window.localStorage.setItem("dwas-demo-uid", result.uid);
      setStatus(txt("admin.demo.success"));
    } catch {
      setStatus(txt("admin.demo.failure"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      dir={lang === "ur" ? "rtl" : "ltr"}
      className="flex w-full max-w-sm flex-col gap-3 rounded-md border border-hairline bg-background p-4"
    >
      <p className="text-sm text-ink-subtle">{txt("admin.demo.note")}</p>
      <label className="flex flex-col gap-1 text-sm text-ink">
        {txt("admin.demo.phone")}
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          inputMode="tel"
          required
          className="rounded-md border border-hairline bg-background px-3 py-2 text-ink outline-none focus:border-primary"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-ink">
        {txt("admin.demo.code")}
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          inputMode="numeric"
          required
          className="rounded-md border border-hairline bg-background px-3 py-2 text-ink outline-none focus:border-primary"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-ink">
        {txt("admin.demo.role")}
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as Role)}
          className="rounded-md border border-hairline bg-background px-3 py-2 text-ink outline-none focus:border-primary"
        >
          {ROLES.map((option) => (
            <option key={option} value={option}>{txt(`admin.demo.role.${option}`)}</option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={busy || !phone.trim()}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {t(lang, "demo.login")}
      </button>
      {status && <p role="status" className="text-sm text-ink-muted">{status}</p>}
    </form>
  );
}
