import type { Metadata } from "next";
import { FullSpatialReviewLab } from "@/components/v2-prototype/full-spatial-review-lab";
import { LocaleProvider } from "@/i18n/locale-provider";
import { getRequestLocale } from "@/i18n/server";

export const metadata: Metadata = {
  title: "Time Hacker Full 100 Spatial Review",
  robots: { index: false, follow: false },
};

interface SpatialReviewPageProps {
  searchParams: Promise<{ level?: string }>;
}

export default async function SpatialReviewPage({ searchParams }: SpatialReviewPageProps) {
  const [locale, query] = await Promise.all([getRequestLocale(), searchParams]);
  const parsed = Number(query.level);
  const initialLevel = Number.isInteger(parsed) && parsed >= 1 && parsed <= 100 ? parsed : 1;
  return (
    <LocaleProvider initialLocale={locale}>
      <FullSpatialReviewLab initialLevel={initialLevel} />
    </LocaleProvider>
  );
}
