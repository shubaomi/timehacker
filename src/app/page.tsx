import { TimeHackerApp } from "@/components/time-hacker-app";
import { LocaleProvider } from "@/i18n/locale-provider";
import { getRequestLocale } from "@/i18n/server";

export default async function Home() {
  const locale = await getRequestLocale();
  return (
    <LocaleProvider initialLocale={locale}>
      <TimeHackerApp />
    </LocaleProvider>
  );
}
