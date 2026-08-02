"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
  localeTag,
  translate,
  type Locale,
  type MessageKey,
} from "./config";

type Values = Record<string, string | number>;

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, values?: Values) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState(initialLocale);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    document.cookie = `${LOCALE_COOKIE}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    document.documentElement.lang = localeTag(nextLocale);
  }, []);

  const t = useCallback(
    (key: MessageKey, values: Values = {}) => translate(locale, key, values),
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used inside LocaleProvider");
  return value;
}
