import { isLookupTranslation, type LookupTranslation } from "./translations";

export type Passage = { reference: string; text: string; translation: LookupTranslation };

export class ScriptureError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export function parseLookup(reference: string, translation: string) {
  const value = reference.trim().replace(/[–—]/g, "-").replace(/\s+/g, " ");
  const match = value.match(/^[1-3]?\s*[a-zA-Z ]+\s+(\d{1,3}):(\d{1,3})(?:-(\d{1,3}))?$/);
  if (value.length > 120 || !match || !isLookupTranslation(translation) || Number(match[1]) < 1 || Number(match[2]) < 1
    || (match[3] && (Number(match[3]) < Number(match[2]) || Number(match[3]) - Number(match[2]) > 49))) {
    throw new ScriptureError("Enter a book, chapter, and verse or range, such as John 3:16-18.", 400);
  }
  return { reference: value, translation };
}

export function passageKey(reference: string, translation: string) {
  return `${translation}:${reference.toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, "")}`;
}

export async function fetchPassage(reference: string, translation: LookupTranslation): Promise<Passage> {
  const url = new URL(`https://bible-api.com/${encodeURIComponent(reference)}`);
  url.searchParams.set("translation", translation.toLowerCase());
  try {
    const response = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
    if (response.status === 404) throw new ScriptureError("Passage not found. Check the reference and try again.", 404);
    if (!response.ok) throw new Error("Scripture request failed.");
    const data: { reference?: unknown; text?: unknown; translation_id?: unknown } = await response.json();
    if (typeof data.reference !== "string" || typeof data.text !== "string" || data.translation_id !== translation.toLowerCase() || !data.text.trim()) throw new Error("Unexpected response.");
    const text = data.text.trim();
    if (text.length > 6000 || text.split(/\s+/).length > 500) {
      throw new ScriptureError("This passage is too long to practice. Choose a shorter range.", 400);
    }
    return { reference: data.reference, text, translation };
  } catch (error) {
    if (error instanceof ScriptureError) throw error;
    throw new ScriptureError("The Bible source is unavailable. Please try again.", 502);
  }
}
