import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const practiceMode = v.union(v.literal("read"), v.literal("blanks"), v.literal("ordering"), v.literal("letters"), v.literal("spoken"), v.literal("reference"));

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
    sourceId: v.optional(v.id("scripturePassages")),
  }).index("by_user", ["userId"]),
  scripturePassages: defineTable({
    key: v.string(),
    reference: v.string(),
    translation: v.union(v.literal("KJV"), v.literal("WEB")),
    text: v.string(),
    audioId: v.optional(v.id("_storage")),
    narrationStartedAt: v.optional(v.number()),
    narrationFailedAt: v.optional(v.number()),
  }).index("by_key", ["key"]),
  scriptureAliases: defineTable({
    key: v.string(),
    passageId: v.id("scripturePassages"),
  }).index("by_key", ["key"]),
  narrationUsage: defineTable({
    key: v.string(),
    characters: v.number(),
  }).index("by_key", ["key"]),
  accountPractice: defineTable({ accountId: v.id("users"), event: practiceEvent }).index("by_account_event", ["accountId", "event.id"]),
  practice: defineTable({
    playerKey: v.string(),
    event: practiceEvent,
  }).index("by_player_event", ["playerKey", "event.id"]),
});
