import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { getAccountId } from "./auth";

export const createUser = internalMutation({
  args: {
    method: v.object({ name: v.literal("usernamePasskey"), profile: v.object({}) }),
  },
  returns: v.id("users"),
  handler: async (ctx) => await ctx.db.insert("users", {}),
});

export const viewer = query({
  args: {},
  returns: v.union(v.null(), v.object({ userId: v.id("users") })),
  handler: async (ctx) => {
    const userId = await getAccountId(ctx);
    return userId === null ? null : { userId };
  },
});
