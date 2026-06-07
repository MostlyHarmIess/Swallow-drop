import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

export const upsert = mutation({
  args: {
    name: v.string(),
    color: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("presence")
      .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, { lastSeen: Date.now() })
    } else {
      await ctx.db.insert("presence", {
        ...args,
        lastSeen: Date.now(),
      })
    }
  },
})

export const list = query({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 45000
    return await ctx.db
      .query("presence")
      .filter((q) => q.gt(q.field("lastSeen"), cutoff))
      .collect()
  },
})

export const remove = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("presence")
      .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
      .first()

    if (existing) {
      await ctx.db.delete(existing._id)
    }
  },
})