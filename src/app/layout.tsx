import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import LanguageToggle from "@/components/LanguageToggle";
import { DEFAULT_LANG } from "@/lib/i18n";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DWAS",
  description: "DWAS — voice-first home-repair technician booking app",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={DEFAULT_LANG} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <LanguageToggle />
        {children}
      </body>
    </html>
  );
}
