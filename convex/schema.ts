import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

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
    status: v.union(v.literal("available"), v.literal("offline")),
  }),

  claims: defineTable({
    dropId: v.id("drops"),
    claimantName: v.string(),
    claimantSession: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("transferring"),
      v.literal("complete"),
      v.literal("failed")
    ),
  }),

  presence: defineTable({
    name: v.string(),
    color: v.string(),
    lastSeen: v.number(),
    sessionId: v.string(),
  }),
})