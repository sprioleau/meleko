import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { verses } from "../lib/verses.ts";

const key = process.env.ELEVENLABS_API_KEY;
const voice = process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";
if (!key) throw new Error("Set ELEVENLABS_API_KEY in .env.local before generating narration.");

await mkdir("public/narration", { recursive: true });
for (const verse of verses) {
  const output = `public/narration/${verse.id}.mp3`;
  if (existsSync(output)) continue;
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_64`, {
    method: "POST",
    headers: { "xi-api-key": key, "content-type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text: verse.text, model_id: "eleven_multilingual_v2", language_code: "en" }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`ElevenLabs returned HTTP ${response.status} for ${verse.reference}.`);
  await writeFile(output, Buffer.from(await response.arrayBuffer()));
  console.log(`Generated ${verse.reference}`);
}
