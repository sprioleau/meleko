type Passage = { reference: string; text: string; translation: string };
const cache = new Map<string, { passage: Passage; expiresAt: number }>();

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const reference = params.get("reference")?.trim().replace(/\s+/g, " ") ?? "";
  const translation = params.get("translation") ?? "";
  const match = reference.match(/^[1-3]?\s*[a-zA-Z ]+\s+(\d{1,3}):(\d{1,3})(?:-(\d{1,3}))?$/);
  if (reference.length > 120 || !match || !["KJV", "WEB"].includes(translation) || Number(match[1]) < 1 || Number(match[2]) < 1 || (match[3] && (Number(match[3]) < Number(match[2]) || Number(match[3]) - Number(match[2]) > 49))) {
    return Response.json({ error: "Enter a book, chapter, and verse or range, such as John 3:16-18." }, { status: 400 });
  }
  const key = `${translation}:${reference.toLowerCase()}`;
  const saved = cache.get(key);
  if (saved && saved.expiresAt > Date.now()) return Response.json(saved.passage);
  try {
    const response = await fetch(`https://bible-api.com/${encodeURIComponent(reference)}?translation=${translation.toLowerCase()}`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (response.status === 404) {
      return Response.json({ error: "Passage not found. Check the reference and try again." }, { status: 404 });
    }
    if (!response.ok) throw new Error("The Scripture source did not respond successfully.");
    const data: { reference?: unknown; text?: unknown; translation_id?: unknown } = await response.json();
    if (typeof data.reference !== "string" || typeof data.text !== "string" || data.translation_id !== translation.toLowerCase() || !data.text.trim()) throw new Error("Unexpected response");
    if (data.text.length > 6000 || data.text.trim().split(/\s+/).length > 500) {
      return Response.json({ error: "This passage is too long to practice. Choose a shorter range." }, { status: 400 });
    }
    const passage = { reference: data.reference, text: data.text.trim(), translation };
    if (cache.size >= 200) cache.delete(cache.keys().next().value!);
    cache.set(key, { passage, expiresAt: Date.now() + 3600000 });
    return Response.json(passage);
  } catch {
    return Response.json({ error: "The Bible source is unavailable. Please try again." }, { status: 502 });
  }
}
