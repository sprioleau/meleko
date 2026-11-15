import { mutationGeneric, queryGeneric, paginationOptsValidator, type DataModelFromSchemaDefinition, type MutationBuilder, type QueryBuilder } from "convex/server";
import { v } from "convex/values";
import { dayKey, eventKey, shiftDay } from "../lib/progress";
import { findVerse } from "../lib/verses";
import schema, { practiceEvent } from "./schema";

const mutation: MutationBuilder<DataModelFromSchemaDefinition<typeof schema>, "public"> = mutationGeneric;

export const sync = mutation({
  args: { playerKey: v.string(), events: v.array(practiceEvent) },
  handler: async ({ db }, { playerKey, events }) => {
    if (!/^[a-f0-9]{64}$/.test(playerKey) || events.length > 50) throw new Error("Invalid progress sync.");
    const latest = shiftDay(dayKey(), 1);

    for (const event of events) {
      const verse = findVerse(event.verseId);
      if (!verse || !/^\d{4}-\d{2}-\d{2}$/.test(event.date) || event.date > latest || event.date < "2024-01-01"
        || Number.isNaN(Date.parse(event.date)) || shiftDay(event.date, 0) !== event.date
        || event.id !== eventKey({ ...event, verseId: verse.id })) throw new Error("Invalid practice event.");

      const existing = await db.query("practice")
        .withIndex("by_player_event", (index) => index.eq("playerKey", playerKey).eq("event.id", event.id))
        .unique();
      if (!existing) await db.insert("practice", { playerKey, event });
      else if (event.isIndependent && !existing.event.isIndependent) await db.patch(existing._id, { event });
    }

    return null;
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
