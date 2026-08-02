import "server-only";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, resolveLocale, type Locale } from "./config";

export async function getRequestLocale(): Promise<Locale> {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (cookieLocale) return resolveLocale(cookieLocale);
  return resolveLocale((await headers()).get("accept-language"));
}
