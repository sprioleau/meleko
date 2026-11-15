import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const practiceMode = v.union(v.literal("read"), v.literal("blanks"), v.literal("ordering"), v.literal("letters"), v.literal("spoken"));

export const practiceEvent = v.object({
  id: v.string(),
  verseId: v.string(),
  mode: practiceMode,
  date: v.string(),
  isIndependent: v.boolean(),
});

export default defineSchema({
  practice: defineTable({
    playerKey: v.string(),
    event: practiceEvent,
  }).index("by_player_event", ["playerKey", "event.id"]),
});
