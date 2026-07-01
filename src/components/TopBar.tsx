import { Search } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { ui } from "../data/uiStrings";
import type { PillarId } from "../types/brain";
import { getPillarNodes } from "../utils/graphHelpers";

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit: () => void;
  activePillar: PillarId | "all";
  onPillarChange: (pillar: PillarId | "all") => void;
  isReadOnly: boolean;
  onModeChange: (value: boolean) => void;
}

/** Top navigation: title, search, filters, language switcher. */
export function TopBar({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  activePillar,
  onPillarChange,
  isReadOnly,
  onModeChange,
}: TopBarProps) {
  const { language, setLanguage, t } = useLanguage();
  const pillars = getPillarNodes();

  return (
    <div className="compact-toolbar">
      <div className="compact-toolbar__left">
        <div className="top-bar__logo" />
        <form
          className="top-bar__search compact"
          onSubmit={(e) => {
            e.preventDefault();
            onSearchSubmit();
          }}
        >
          <Search size={18} className="top-bar__search-icon" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={ui("searchPlaceholder", language)}
            aria-label={ui("searchPlaceholder", language)}
          />
        </form>
      </div>

      <div className="compact-toolbar__right">
        <div className="top-bar__filters compact">
          <button
            type="button"
            className={`filter-chip ${activePillar === "all" ? "filter-chip--active" : ""}`}
            onClick={() => onPillarChange("all")}
          >
            {ui("allPillars", language)}
          </button>
          {pillars.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`filter-chip ${activePillar === p.id ? "filter-chip--active" : ""}`}
              onClick={() => onPillarChange(p.id as PillarId)}
              style={
                {
                  "--chip-color": `var(--pillar-${p.id}, #6366f1)`,
                } as React.CSSProperties
              }
            >
              {t(p.title)}
            </button>
          ))}
        </div>

        <div className="top-bar__actions compact">
          <button
            type="button"
            className={`mode-toggle ${isReadOnly ? "mode-toggle--read-only" : "mode-toggle--edit"}`}
            onClick={() => onModeChange(!isReadOnly)}
          >
            {isReadOnly
              ? language === "fr"
                ? "Lecture seule"
                : "Read-only"
              : language === "fr"
                ? "Édition"
                : "Edit"}
          </button>

          <div className="lang-switcher" role="group" aria-label="Language">
            {(["fr", "en"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                className={`lang-switcher__btn ${language === lang ? "lang-switcher__btn--active" : ""}`}
                onClick={() => setLanguage(lang)}
                aria-pressed={language === lang}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
