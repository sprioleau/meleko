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
  users: defineTable({}),
  personalVerses: defineTable({
    userId: v.id("users"),
    reference: v.string(),
    translation: v.string(),
    text: v.string(),
    isRemoved: v.optional(v.boolean()),
  }).index("by_user", ["userId"]),
  accountPractice: defineTable({ accountId: v.id("users"), event: practiceEvent }).index("by_account_event", ["accountId", "event.id"]),
  practice: defineTable({
    playerKey: v.string(),
    event: practiceEvent,
  }).index("by_player_event", ["playerKey", "event.id"]),
});
