import type { Metadata } from "next";
import "@fontsource-variable/azeret-mono";
import "@fontsource-variable/bricolage-grotesque";
import { localeTag } from "@/i18n/config";
import { getRequestLocale } from "@/i18n/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Time Hacker | 时间黑客",
  description: "A tiny timing game with 100 playful secrets. 让时间停在10.00秒，并发现藏在页面里的100个小秘密。",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getRequestLocale();
  return (
    <html lang={localeTag(locale)}>
      <body>{children}</body>
    </html>
  );
}
