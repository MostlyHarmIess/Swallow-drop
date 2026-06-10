import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    fileName: v.string(),
    from: v.string(),
    to: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("transferHistory", {
      fileName: args.fileName,
      from: args.from,
      to: args.to,
      createdAt: args.createdAt,
    });
  },
});

export const listRecent = query({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db.query("transferHistory").order("desc").take(args.limit);
  },
});
