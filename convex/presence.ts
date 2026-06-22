import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

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
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, { lastSeen: now });
    } else {
      await ctx.db.insert("presence", { ...args, lastSeen: now });
    }

    // Schedule cleanup 50s from now (just past the 45s cutoff)
    await ctx.scheduler.runAfter(50000, internal.presence.cleanupSession, {
      sessionId: args.sessionId,
      heartbeatTime: now,
    });
  },
});

export const cleanupSession = internalMutation({
  args: {
    sessionId: v.string(),
    heartbeatTime: v.number(),
  },
  handler: async (ctx, args) => {
    const presence = await ctx.db
      .query("presence")
      .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
      .first();

    // If lastSeen hasn't advanced since this heartbeat fired, session is dead
    if (!presence || presence.lastSeen !== args.heartbeatTime) return;

    // Delete their drops
    const drops = await ctx.db
      .query("drops")
      .filter((q) => q.eq(q.field("senderSessionId"), args.sessionId))
      .collect();

    for (const drop of drops) {
      await ctx.db.delete(drop._id);
    }

    // Remove presence
    await ctx.db.delete(presence._id);
  },
});

export const remove = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("presence")
      .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
      .first();
    if (existing) await ctx.db.delete(existing._id);

    // Also clean up drops immediately on explicit disconnect
    const drops = await ctx.db
      .query("drops")
      .filter((q) => q.eq(q.field("senderSessionId"), args.sessionId))
      .collect();
    for (const drop of drops) {
      await ctx.db.delete(drop._id);
    }
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("presence").collect();
  },
});