import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  drops: defineTable({
    fileName: v.string(),
    originalName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
    isFolder: v.boolean(),
    fileCount: v.number(),
    senderName: v.string(),
    senderSessionId: v.string(),
    slotId: v.number(),
  }),

  claims: defineTable({
    dropId: v.id("drops"),
    senderSessionId: v.string(),
    claimantName: v.string(),
    claimantSession: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("transferring"),
      v.literal("complete"),
      v.literal("failed"),
    ),
  }),

  signaling: defineTable({
    fromSessionId: v.string(),
    toSessionId: v.string(),
    message: v.string(),
    createdAt: v.number(),
  }),

  presence: defineTable({
    name: v.string(),
    color: v.string(),
    lastSeen: v.number(),
    sessionId: v.string(),
  }),

  transferHistory: defineTable({
    fileName: v.string(),
    from: v.string(),
    to: v.string(),
    createdAt: v.number(),
  }),
});
