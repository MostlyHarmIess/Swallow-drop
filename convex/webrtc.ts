import { mutation, query } from "./_generated/server";
import { v } from "convex/values";


// WebRTC Signaling

export const sendSignaling = mutation({
  args: {
    fromSessionId: v.string(),
    toSessionId: v.string(),
    message: v.string(), // JSON stringified signaling message
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("signaling", {
      fromSessionId: args.fromSessionId,
      toSessionId: args.toSessionId,
      message: args.message,
      createdAt: Date.now(),
    });
  },
});

export const listForSession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("signaling")
      .filter((q) => q.eq(q.field("toSessionId"), args.sessionId))
      .collect();
  },
});

export const consumeMessage = mutation({
  args: { messageId: v.id("signaling") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.messageId);
  },
});
