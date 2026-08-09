import type { Metadata } from "next";
import { PrototypeLab } from "@/components/v2-prototype/prototype-lab";
import { LocaleProvider } from "@/i18n/locale-provider";
import { getRequestLocale } from "@/i18n/server";

export const metadata: Metadata = {
  title: "Time Hacker V2 · Gate B Playtest",
  robots: { index: false, follow: false },
};

export default async function V2PlaytestPage() {
  const locale = await getRequestLocale();
  return (
    <LocaleProvider initialLocale={locale}>
      <PrototypeLab />
    </LocaleProvider>
  );
}
