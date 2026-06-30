import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Language, LocalizedText } from "../types/brain";
import { uiStrings, type UIStrings } from "../data/uiStrings";
import { pick } from "../utils/i18n";

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  /** Pick active language from bilingual data. */
  t: (text: LocalizedText) => string;
  ui: UIStrings;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "brain-language";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "en" ? "en" : "fr";
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }, []);

  const t = useCallback(
    (text: LocalizedText) => pick(text, language),
    [language],
  );

  const value = useMemo(
    () => ({ language, setLanguage, t, ui: uiStrings }),
    [language, setLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

/** Hook to access language, t(), and ui strings. */
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
