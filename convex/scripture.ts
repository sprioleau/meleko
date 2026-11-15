import { ConvexError, v } from "convex/values";
import { api, internal } from "./_generated/api";
import { action, internalMutation, internalQuery, query, type MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { fetchPassage, parseLookup, passageKey, ScriptureError, type Passage } from "../lib/scripture";

type FoundPassage = Passage & { sourceId: Id<"scripturePassages"> };

export const find = internalQuery({
  args: { key: v.string() },
  handler: async ({ db }, { key }) => {
    const direct = await db.query("scripturePassages").withIndex("by_key", (index) => index.eq("key", key)).unique();
    if (direct) return direct;
    const alias = await db.query("scriptureAliases").withIndex("by_key", (index) => index.eq("key", key)).unique();
    return alias ? db.get("scripturePassages", alias.passageId) : null;
  },
});

async function enqueue(ctx: MutationCtx, passage: Doc<"scripturePassages">, userId: Id<"users">) {
  const now = Date.now();
  if (!process.env.ELEVENLABS_API_KEY || passage.audioId
    || (passage.narrationStartedAt && now - passage.narrationStartedAt < 5 * 60_000)
    || (passage.narrationFailedAt && now - passage.narrationFailedAt < 30 * 60_000)) return;

  const day = new Date(now).toISOString().slice(0, 10);
  const limits = [{ key: day, limit: 30_000 }, { key: `${day}:${userId}`, limit: 8_000 }];
  const usage = await Promise.all(limits.map(({ key }) =>
    ctx.db.query("narrationUsage").withIndex("by_key", (index) => index.eq("key", key)).unique()
  ));
  if (limits.some(({ limit }, index) => (usage[index]?.characters ?? 0) + passage.text.length > limit)) return;
  for (const [index, entry] of limits.entries()) {
    const previous = usage[index];
    const characters = (previous?.characters ?? 0) + passage.text.length;
    if (previous) await ctx.db.patch("narrationUsage", previous._id, { characters });
    else await ctx.db.insert("narrationUsage", { key: entry.key, characters });
  }

  await ctx.db.patch("scripturePassages", passage._id, { narrationStartedAt: now, narrationFailedAt: undefined });
  await ctx.scheduler.runAfter(0, internal.narration.generate, { passageId: passage._id, startedAt: now });
}

export const store = internalMutation({
  args: {
    aliasKey: v.string(),
    userId: v.id("users"),
    passage: v.object({ reference: v.string(), translation: v.union(v.literal("KJV"), v.literal("WEB")), text: v.string() }),
  },
  handler: async (ctx, { aliasKey, userId, passage }) => {
    const key = passageKey(passage.reference, passage.translation);
    const old = await ctx.db.query("scripturePassages").withIndex("by_key", (index) => index.eq("key", key)).unique();
    const passageId = old?._id ?? await ctx.db.insert("scripturePassages", { key, ...passage });
    if (aliasKey !== key) {
      const alias = await ctx.db.query("scriptureAliases").withIndex("by_key", (index) => index.eq("key", aliasKey)).unique();
      if (!alias) await ctx.db.insert("scriptureAliases", { key: aliasKey, passageId });
    }
    const saved = old ?? await ctx.db.get("scripturePassages", passageId);
    if (saved) await enqueue(ctx, saved, userId);
    return passageId;
  },
});

export const queueExisting = internalMutation({
  args: { passageId: v.id("scripturePassages"), userId: v.id("users") },
  handler: async (ctx, { passageId, userId }) => {
    const passage = await ctx.db.get("scripturePassages", passageId);
    if (passage) await enqueue(ctx, passage, userId);
  },
});

export const lookup = action({
  args: { reference: v.string(), translation: v.string() },
  handler: async (ctx, args): Promise<FoundPassage> => {
    const viewer = await ctx.runQuery(api.users.viewer, {});
    if (!viewer) throw new ConvexError("Sign in to look up a passage.");
    try {
      const { reference, translation } = parseLookup(args.reference, args.translation);
      const key = passageKey(reference, translation);
      const cached = await ctx.runQuery(internal.scripture.find, { key });
      if (cached) {
        if (!cached.audioId) await ctx.runMutation(internal.scripture.queueExisting, { passageId: cached._id, userId: viewer.userId });
        return { reference: cached.reference, text: cached.text, translation, sourceId: cached._id };
      }
      const passage = await fetchPassage(reference, translation);
      const sourceId = await ctx.runMutation(internal.scripture.store, { aliasKey: key, userId: viewer.userId, passage });
      return { ...passage, sourceId };
    } catch (error) {
      if (error instanceof ScriptureError) throw new ConvexError(error.message);
      throw error;
    }
  },
});

export const audio = query({
  args: { sourceId: v.id("scripturePassages") },
  handler: async (ctx, { sourceId }) => {
    const passage = await ctx.db.get("scripturePassages", sourceId);
    if (!passage) return null;
    return {
      url: passage.audioId ? await ctx.storage.getUrl(passage.audioId) : null,
      isPreparing: Boolean(passage.narrationStartedAt),
    };
  },
});

export const narrationInput = internalQuery({
  args: { passageId: v.id("scripturePassages"), startedAt: v.number() },
  handler: async ({ db }, { passageId, startedAt }) => {
    const passage = await db.get("scripturePassages", passageId);
    return passage?.narrationStartedAt === startedAt && !passage.audioId ? passage.text : null;
  },
});

export const finishNarration = internalMutation({
  args: { passageId: v.id("scripturePassages"), startedAt: v.number(), audioId: v.optional(v.id("_storage")) },
  handler: async ({ db, storage }, { passageId, startedAt, audioId }) => {
    const passage = await db.get("scripturePassages", passageId);
    if (!passage || passage.narrationStartedAt !== startedAt || passage.audioId) {
      if (audioId) await storage.delete(audioId);
      return;
    }
    await db.patch("scripturePassages", passageId, {
      audioId, narrationStartedAt: undefined, narrationFailedAt: audioId ? undefined : Date.now(),
    });
  },
});
