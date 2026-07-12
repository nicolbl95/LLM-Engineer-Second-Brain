/**
 * Safe reusable translation utility using a LibreTranslate-compatible API.
 *
 * ## Configuration
 *
 * Set the environment variable `VITE_TRANSLATE_API_URL` to your
 * LibreTranslate instance, e.g.:
 *
 *   VITE_TRANSLATE_API_URL=http://localhost:5000
 *
 * If the variable is not set, translateText() returns the original
 * text and logs a warning — the app continues to work normally.
 */

/** In‑memory cache to avoid translating the same text repeatedly. */
const translationCache = new Map<string, string>();

/**
 * Translate a single piece of text to the target language.
 *
 * @param text          The text to translate.
 * @param targetLanguage  Target language code ("en" or "fr").
 * @returns The translated text, or the original text on failure.
 */
export async function translateText(
  text: string,
  targetLanguage: "en" | "fr",
): Promise<string> {
  // ----- Guard: empty / whitespace -----
  if (!text || !text.trim()) return "";

  // ----- Guard: "New Node" placeholder -----
  if (text.trim() === "New Node") return text;

  // ----- Check cache -----
  const cacheKey = `${targetLanguage}:${text}`;
  const cached = translationCache.get(cacheKey);
  if (cached !== undefined) return cached;

  // ----- No endpoint configured -----
  const baseUrl = import.meta.env.VITE_TRANSLATE_API_URL as
    | string
    | undefined;

  if (!baseUrl) {
    console.warn(
      "[autoTranslate] VITE_TRANSLATE_API_URL not set — translation disabled.",
    );
    return text;
  }

  // ----- Perform request -----
  try {
    const response = await fetch(`${baseUrl}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source: "auto",
        target: targetLanguage,
        format: "text",
      }),
    });

    if (!response.ok) {
      console.warn(
        `[autoTranslate] API returned ${response.status} ${response.statusText}`,
      );
      return text;
    }

    const data: unknown = await response.json();

    // LibreTranslate returns { translatedText: "..." }
    if (
      data &&
      typeof data === "object" &&
      "translatedText" in data &&
      typeof (data as Record<string, unknown>).translatedText === "string"
    ) {
      const translated = (data as { translatedText: string }).translatedText;
      translationCache.set(cacheKey, translated);
      return translated;
    }

    // Alternative: { translations: [{ translatedText: "..." }] }
    if (
      data &&
      typeof data === "object" &&
      "translations" in data &&
      Array.isArray((data as Record<string, unknown>).translations)
    ) {
      const translations = (data as { translations: unknown[] }).translations;
      const first = translations[0];
      if (
        first &&
        typeof first === "object" &&
        "translatedText" in first &&
        typeof (first as Record<string, unknown>).translatedText === "string"
      ) {
        const translated = (first as { translatedText: string }).translatedText;
        translationCache.set(cacheKey, translated);
        return translated;
      }
    }

    // Unexpected shape — return original
    console.warn("[autoTranslate] Unexpected API response shape", data);
    return text;
  } catch (err) {
    console.warn("[autoTranslate] Translation request failed", err);
    return text;
  }
}

/**
 * Clear the in-memory translation cache.
 * Useful for testing or when the user changes their translation backend.
 */
export function clearTranslationCache(): void {
  translationCache.clear();
}