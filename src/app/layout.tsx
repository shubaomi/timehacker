import type { Metadata } from "next";
import "@fontsource-variable/azeret-mono";
import "@fontsource-variable/bricolage-grotesque";
import { localeTag } from "@/i18n/config";
import { getRequestLocale } from "@/i18n/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Time Hacker | 时间黑客",
  description: "A bilingual precision timing experiment with 100 hidden ways to bend the clock. 中英双语精准计时与百种时间漏洞挑战。",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getRequestLocale();
  return (
    <html lang={localeTag(locale)}>
      <body>{children}</body>
    </html>
  );
}
