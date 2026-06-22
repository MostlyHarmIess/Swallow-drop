import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("drops").collect();
  },
});

export const create = mutation({
  args: {
    fileName: v.string(),
    originalName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
    isFolder: v.boolean(),
    fileCount: v.number(),
    senderName: v.string(),
    senderSessionId: v.string(),
    slotId: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("drops", {
      ...args,
    });
  },
});
