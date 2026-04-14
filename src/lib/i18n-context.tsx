"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { translations, type Lang } from "./i18n";

type I18nValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (typeof translations)[Lang];
};

const I18nContext = createContext<I18nValue>({
  lang: "pl",
  setLang: () => {},
  t: translations.pl as unknown as (typeof translations)[Lang],
});

const LS_LANG = "ollama-lang";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "pl";
    return (localStorage.getItem(LS_LANG) as Lang) || "pl";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(LS_LANG, lang);
      document.documentElement.lang = lang;
    }
  }, [lang]);

  function setLang(next: Lang) {
    setLangState(next);
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
