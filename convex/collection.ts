import { mutationGeneric, queryGeneric, type DataModelFromSchemaDefinition, type MutationBuilder, type QueryBuilder } from "convex/server";
import { v } from "convex/values";
import { getAccountId } from "./auth";
import schema from "./schema";

const query: QueryBuilder<DataModelFromSchemaDefinition<typeof schema>, "public"> = queryGeneric;
const mutation: MutationBuilder<DataModelFromSchemaDefinition<typeof schema>, "public"> = mutationGeneric;

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAccountId(ctx);
    if (!userId) return [];
    const verses = await ctx.db.query("personalVerses").withIndex("by_user", (index) => index.eq("userId", userId)).collect();
    return verses.filter((verse) => !verse.isRemoved);
  },
});

export const add = mutation({
  args: { reference: v.string(), translation: v.string(), text: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAccountId(ctx);
    if (!userId) throw new Error("Sign in to save a verse.");
    const reference = args.reference.trim();
    const translation = args.translation.trim();
    const text = args.text.trim();
    if (!reference || reference.length > 120 || !["KJV", "WEB", "ESV", "NASB", "NLT", "NIV"].includes(translation) || !/[a-z]/i.test(text) || text.length > 6000 || text.split(/\s+/).length > 500) throw new Error("Invalid verse.");
    const verses = await ctx.db.query("personalVerses").withIndex("by_user", (index) => index.eq("userId", userId)).collect();
    const existing = verses.find((verse) =>
      verse.reference.toLowerCase() === reference.toLowerCase() && verse.translation === translation && verse.text === text
    );
    if (existing) {
      if (existing.isRemoved) await ctx.db.patch("personalVerses", existing._id, { isRemoved: false });
      return existing._id;
    }
    return await ctx.db.insert("personalVerses", { userId, reference, translation, text });
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
