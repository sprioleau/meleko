import { mutationGeneric, queryGeneric, type DataModelFromSchemaDefinition, type MutationBuilder, type QueryBuilder } from "convex/server";
import { v } from "convex/values";
import { getAccountId } from "./auth";
import schema from "./schema";
import { isTranslation } from "../lib/translations";

const query: QueryBuilder<DataModelFromSchemaDefinition<typeof schema>, "public"> = queryGeneric;
const mutation: MutationBuilder<DataModelFromSchemaDefinition<typeof schema>, "public"> = mutationGeneric;

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAccountId(ctx);
    if (!userId) return [];
    const verses = await ctx.db.query("personalVerses").withIndex("by_user", (index) => index.eq("userId", userId)).collect();
    return Promise.all(verses.filter((verse) => !verse.isRemoved).map(async (verse) => {
      const source = verse.sourceId ? await ctx.db.get("scripturePassages", verse.sourceId) : null;
      return { ...verse, narrationUrl: source?.audioId ? await ctx.storage.getUrl(source.audioId) : null };
    }));
  },
});

export const add = mutation({
  args: { reference: v.string(), translation: v.string(), text: v.string(), sourceId: v.optional(v.id("scripturePassages")) },
  handler: async (ctx, args) => {
    const userId = await getAccountId(ctx);
    if (!userId) throw new Error("Sign in to save a verse.");
    const reference = args.reference.trim();
    const translation = args.translation.trim();
    const text = args.text.trim();
    if (!reference || reference.length > 120 || !isTranslation(translation) || !/[a-z]/i.test(text) || text.length > 6000 || text.split(/\s+/).length > 500) throw new Error("Invalid verse.");
    const source = args.sourceId ? await ctx.db.get("scripturePassages", args.sourceId) : null;
    if (args.sourceId && (!source || source.reference !== reference || source.translation !== translation || source.text !== text)) {
      throw new Error("Look up the passage again before saving.");
    }
    const sourceId = source?._id;
    const verses = await ctx.db.query("personalVerses").withIndex("by_user", (index) => index.eq("userId", userId)).collect();
    const existing = verses.find((verse) =>
      verse.reference.toLowerCase() === reference.toLowerCase() && verse.translation === translation && verse.text === text
    );
    if (existing) {
      if (existing.isRemoved || (sourceId && !existing.sourceId)) {
        await ctx.db.patch("personalVerses", existing._id, { isRemoved: false, sourceId: sourceId ?? existing.sourceId });
      }
      return existing._id;
    }
    return await ctx.db.insert("personalVerses", { userId, reference, translation, text, sourceId });
  },
});

export const remove = mutation({
  args: { verseId: v.id("personalVerses") },
  handler: async (ctx, { verseId }) => {
    const userId = await getAccountId(ctx);
    const verse = await ctx.db.get("personalVerses", verseId);
    if (!userId || verse?.userId !== userId) throw new Error("Verse not found.");
    await ctx.db.patch("personalVerses", verseId, { isRemoved: true });
  },
});
