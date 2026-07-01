import { useEffect, useMemo, useState } from "react";
import type { BrainEdge } from "../types/brain";
import { useLanguage } from "../context/LanguageContext";

interface EdgeEditorProps {
  edge: BrainEdge | null;
  isReadOnly: boolean;
  onChange: (edge: BrainEdge) => void;
  onDelete: (edgeId: string) => void;
}

export function EdgeEditor({ edge, isReadOnly, onChange, onDelete }: EdgeEditorProps) {
  const { language } = useLanguage();
  const [draft, setDraft] = useState<BrainEdge | null>(null);

  useEffect(() => {
    setDraft(edge);
  }, [edge]);

  const currentDraft = useMemo(() => draft ?? edge, [draft, edge]);

  if (!currentDraft) return null;

  const updateDraft = (updates: Partial<BrainEdge>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...updates };
      onChange(next);
      return next;
    });
  };

  const handleSave = () => {
    if (draft) {
      onChange(draft);
    }
  };

  return (
    <div className="edge-editor">
      <div className="edge-editor__header">
        <strong>{language === "fr" ? "Connexion" : "Connection"}</strong>
      </div>

      <div className="edge-editor__body">
        <label className="edge-editor__field">
          <span>{language === "fr" ? "Libellé" : "Label"}</span>
          {isReadOnly ? (
            <p className="edge-editor__value">{currentDraft.label?.[language] ?? ""}</p>
          ) : (
            <input
              className="edge-editor__input"
              value={currentDraft.label?.[language] ?? ""}
              onChange={(e) =>
                updateDraft({
                  label: {
                    fr: currentDraft.label?.fr ?? "",
                    en: currentDraft.label?.en ?? "",
                    [language]: e.target.value,
                  } as { fr: string; en: string },
                })
              }
            />
          )}
        </label>

        {!isReadOnly && (
          <>
            <label className="edge-editor__field">
              <span>{language === "fr" ? "Couleur" : "Color"}</span>
              <input
                type="color"
                className="edge-editor__color"
                value={currentDraft.color ?? "#818cf8"}
                onChange={(e) => updateDraft({ color: e.target.value })}
              />
            </label>

            <label className="edge-editor__field">
              <span>{language === "fr" ? "Style de ligne" : "Line style"}</span>
              <select
                className="edge-editor__select"
                value={currentDraft.lineStyle ?? "solid"}
                onChange={(e) => updateDraft({ lineStyle: e.target.value as "solid" | "dashed" })}
              >
                <option value="solid">{language === "fr" ? "Ligne pleine" : "Solid line"}</option>
                <option value="dashed">{language === "fr" ? "Ligne pointillée" : "Dashed line"}</option>
              </select>
            </label>
          </>
        )}
      </div>

      {!isReadOnly && (
        <div className="edge-editor__actions">
          <button type="button" className="edge-editor__button edge-editor__button--primary" onClick={handleSave}>
            {language === "fr" ? "Enregistrer" : "Save"}
          </button>
          <button type="button" className="edge-editor__button edge-editor__button--danger" onClick={() => currentDraft.id && onDelete(currentDraft.id)}>
            {language === "fr" ? "Supprimer la connexion" : "Delete connection"}
          </button>
        </div>
      )}
    </div>
  );
}
