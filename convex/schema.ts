import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.optional(v.string()),
    password: v.optional(v.string()), // Hashed
    name: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    language: v.optional(v.string()), // "en", "ar"
    notificationsEnabled: v.optional(v.boolean()),
    profilePictureUrl: v.optional(v.string()),
    profilePictureId: v.optional(v.id("_storage")),
  }).index("by_email", ["email"]),

  todos: defineTable({
    userId: v.optional(v.id("users")),
    text: v.string(),
    isCompleted: v.optional(v.boolean()), 
    status: v.optional(v.string()), 
    timerDuration: v.optional(v.number()), 
    timerDirection: v.optional(v.string()), // 'up' | 'down'
    timerStartTime: v.optional(v.number()), 
    timeLeftAtPause: v.optional(v.number()), 
    dueDate: v.optional(v.number()), 
    projectId: v.optional(v.string()), 
    categoryId: v.optional(v.id("projectCategories")),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    meetingLink: v.optional(v.string()),
    priority: v.optional(v.string()), 
    date: v.optional(v.number()), 
    parentId: v.optional(v.id("todos")),
    type: v.optional(v.string()), // 'task' | 'note' | 'reminder'
  }).index("by_user", ["userId"])
    .index("by_parent", ["parentId"]),

  projectCategories: defineTable({
    userId: v.optional(v.id("users")),
    name: v.string(),       
    icon: v.string(),       
    color: v.string(),      
  }).index("by_user", ["userId"]),

  projectSubCategories: defineTable({
    userId: v.optional(v.id("users")),
    categoryId: v.id("projectCategories"),
    name: v.string(),
    icon: v.string(),
    color: v.string(),
  }).index("by_user", ["userId"])
    .index("by_category", ["categoryId"]),

  projects: defineTable({
    userId: v.optional(v.id("users")),
    categoryId: v.optional(v.id("projectCategories")),      
    subCategoryId: v.optional(v.id("projectSubCategories")), 
    name: v.string(),
    description: v.optional(v.string()),
    color: v.string(),      
    icon: v.string(),       
    status: v.optional(v.string()), 
  }).index("by_user", ["userId"])
    .index("by_category", ["categoryId"])
    .index("by_subCategory", ["subCategoryId"]),

  projectResources: defineTable({
    userId: v.optional(v.id("users")),
    projectId: v.id("projects"),
    type: v.string(),       
    title: v.string(),
    url: v.optional(v.string()),
    note: v.optional(v.string()),
  }).index("by_user", ["userId"])
    .index("by_project", ["projectId"]),

  projectChecklists: defineTable({
    userId: v.optional(v.id("users")),
    projectId: v.id("projects"),
    text: v.string(),
    isCompleted: v.boolean(),
  }).index("by_user", ["userId"]),
});
