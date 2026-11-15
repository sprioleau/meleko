import { fetchPassage, parseLookup, passageKey, ScriptureError, type Passage } from "../../../lib/scripture";

const cache = new Map<string, { passage: Passage; expiresAt: number }>();

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  try {
    const { reference, translation } = parseLookup(params.get("reference") ?? "", params.get("translation") ?? "");
    const key = passageKey(reference, translation);
    const saved = cache.get(key);
    if (saved && saved.expiresAt > Date.now()) return Response.json(saved.passage);
    const passage = await fetchPassage(reference, translation);
    const firstKey = cache.keys().next().value;
    if (cache.size >= 200 && firstKey !== undefined) cache.delete(firstKey);
    cache.set(key, { passage, expiresAt: Date.now() + 3600000 });
    return Response.json(passage);
  } catch (error) {
    if (error instanceof ScriptureError) return Response.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
