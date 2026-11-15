"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const generate = internalAction({
  args: { passageId: v.id("scripturePassages"), startedAt: v.number() },
  handler: async (ctx, args) => {
    const text = await ctx.runQuery(internal.scripture.narrationInput, args);
    if (!text) return;
    let audioId: Id<"_storage"> | undefined;
    try {
      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) throw new Error("ElevenLabs is unavailable.");
      const voice = process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";
      const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_64`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify({ text, model_id: "eleven_multilingual_v2" }),
        signal: AbortSignal.timeout(25_000),
      });
      if (!response.ok || !response.headers.get("content-type")?.includes("audio/")) {
        throw new Error(`ElevenLabs narration failed (${response.status}).`);
      }
      audioId = await ctx.storage.store(await response.blob());
    } catch (error) {
      console.warn("Scripture narration failed", error instanceof Error ? error.message : "Unknown error");
    }
    await ctx.runMutation(internal.scripture.finishNarration, { ...args, audioId });
  },
});
