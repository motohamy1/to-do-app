import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  todos: defineTable({
    text: v.string(),
    isCompleted: v.optional(v.boolean()), // Legacy field
    status: v.optional(v.string()), // "not_started", "in_progress", "done", "not_done"
    timerDuration: v.optional(v.number()), // Duration in milliseconds
    timerStartTime: v.optional(v.number()), // Timestamp when timer started
    timeLeftAtPause: v.optional(v.number()), // Recorded remaining time at the moment of pausing
    dueDate: v.optional(v.number()), // Deadline timestamp
    projectId: v.optional(v.string()), // ID of the linked project
    date: v.optional(v.number()), // Planner/Scheduled date timestamp
  }),
});
