import type { Metadata } from "next";
import { DirectorChapterLab } from "@/components/v2-prototype/director-chapter-lab";
import { LocaleProvider } from "@/i18n/locale-provider";
import { getRequestLocale } from "@/i18n/server";

export const metadata: Metadata = {
  title: "Time Hacker Director's Cut · 36-Level Lab",
  robots: { index: false, follow: false },
};

interface DirectorPlaytestPageProps {
  searchParams: Promise<{ level?: string }>;
}

export default async function DirectorPlaytestPage({ searchParams }: DirectorPlaytestPageProps) {
  const [locale, query] = await Promise.all([getRequestLocale(), searchParams]);
  const parsed = Number(query.level);
  const initialLevel = Number.isInteger(parsed) && parsed >= 1 && parsed <= 36 ? parsed : 1;
  return (
    <LocaleProvider initialLocale={locale}>
      <DirectorChapterLab initialLevel={initialLevel} />
    </LocaleProvider>
  );
}
