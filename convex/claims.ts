import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    dropId: v.id("drops"),
    claimantName: v.string(),
    claimantSession: v.string(),
  },
  handler: async (ctx, args) => {
    const drop = await ctx.db.get(args.dropId);

    return await ctx.db.insert("claims", {
      ...args,
      senderSessionId: drop?.senderSessionId || "",
      status: "pending",
    });
  },
});

export const listForSender = query({
  args: { senderSessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("claims")
      .filter((q) => q.eq(q.field("senderSessionId"), args.senderSessionId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
  },
});

export const updateStatus = mutation({
  args: {
    claimId: v.id("claims"),
    status: v.union(
      v.literal("pending"),
      v.literal("transferring"),
      v.literal("complete"),
      v.literal("failed"),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.claimId, { status: args.status });
  },
});

export const listForDrop = query({
  args: { dropId: v.id("drops") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("claims")
      .filter((q) => q.eq(q.field("dropId"), args.dropId))
      .collect();
  },
});
