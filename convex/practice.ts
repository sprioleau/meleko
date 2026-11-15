import { mutationGeneric, queryGeneric, paginationOptsValidator, type DataModelFromSchemaDefinition, type MutationBuilder, type QueryBuilder } from "convex/server";
import { v } from "convex/values";
import { dayKey, eventKey, shiftDay } from "../lib/progress";
import { findVerse } from "../lib/verses";
import { getAccountId } from "./auth";
import schema, { practiceEvent } from "./schema";

const mutation: MutationBuilder<DataModelFromSchemaDefinition<typeof schema>, "public"> = mutationGeneric;

function isValidEvent(event: Parameters<typeof eventKey>[0] & { id: string }, latest: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(event.date)
    && event.date >= "2024-01-01" && event.date <= latest
    && !Number.isNaN(Date.parse(event.date)) && shiftDay(event.date, 0) === event.date
    && event.id === eventKey(event);
}

export const sync = mutation({
  args: { playerKey: v.string(), events: v.array(practiceEvent) },
  handler: async ({ db }, { playerKey, events }) => {
    if (!/^[a-f0-9]{64}$/.test(playerKey) || events.length > 50) throw new Error("Invalid progress sync.");
    const latest = shiftDay(dayKey(), 1);

    for (const event of events) {
      if (!findVerse(event.verseId) || !isValidEvent(event, latest)) throw new Error("Invalid practice event.");

      const existing = await db.query("practice")
        .withIndex("by_player_event", (index) => index.eq("playerKey", playerKey).eq("event.id", event.id))
        .unique();
      if (!existing) await db.insert("practice", { playerKey, event });
      else if (event.isIndependent && !existing.event.isIndependent) await db.patch(existing._id, { event });
    }

    return null;
  },
});

export const syncAccount = mutation({
  args: { accountId: v.id("users"), events: v.array(practiceEvent) },
  handler: async (ctx, { accountId, events }) => {
    const verifiedAccountId = await getAccountId(ctx);
    if (verifiedAccountId !== accountId) return null;
    if (events.length > 50) throw new Error("Invalid progress sync.");
    const latest = shiftDay(dayKey(), 1);
    const rejectedIds: string[] = [];
    const personalPrefix = "personal:";
    const savedVerseOwnership = new Map<string, boolean>();

    for (const event of events) {
      if (!isValidEvent(event, latest)) {
        rejectedIds.push(event.id);
        continue;
      }
      if (!findVerse(event.verseId)) {
        let hasOwner = savedVerseOwnership.get(event.verseId);
        if (hasOwner === undefined) {
          const personalId = event.verseId.startsWith(personalPrefix)
            ? ctx.db.normalizeId("personalVerses", event.verseId.slice(personalPrefix.length))
            : null;
          hasOwner = personalId !== null && (await ctx.db.get("personalVerses", personalId))?.userId === verifiedAccountId;
          savedVerseOwnership.set(event.verseId, hasOwner);
        }
        if (!hasOwner) {
          rejectedIds.push(event.id);
          continue;
        }
      }

      const existing = await ctx.db.query("accountPractice")
        .withIndex("by_account_event", (index) => index.eq("accountId", verifiedAccountId).eq("event.id", event.id))
        .unique();
      if (!existing) await ctx.db.insert("accountPractice", { accountId: verifiedAccountId, event });
      else if (event.isIndependent && !existing.event.isIndependent) await ctx.db.patch(existing._id, { event });
    }

    return { rejectedIds };
  },
});

const query: QueryBuilder<DataModelFromSchemaDefinition<typeof schema>, "public"> = queryGeneric;

export const snapshot = query({
  args: { playerKey: v.string(), paginationOpts: paginationOptsValidator },
  handler: async ({ db }, { playerKey, paginationOpts }) => {
    if (!/^[a-f0-9]{64}$/.test(playerKey) || paginationOpts.numItems > 100) throw new Error("Invalid progress query.");
    return await db.query("practice").withIndex("by_player_event", (index) => index.eq("playerKey", playerKey)).paginate(paginationOpts);
  },
});

export const snapshotAccount = query({
  args: { accountId: v.id("users"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { accountId, paginationOpts }) => {
    const verifiedAccountId = await getAccountId(ctx);
    if (verifiedAccountId !== accountId) return { page: [], isDone: true, continueCursor: "" };
    if (paginationOpts.numItems > 100) throw new Error("Invalid progress query.");
    return await ctx.db.query("accountPractice")
      .withIndex("by_account_event", (index) => index.eq("accountId", verifiedAccountId))
      .paginate(paginationOpts);
  },
});
