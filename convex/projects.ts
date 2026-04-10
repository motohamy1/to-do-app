import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ─── Project Categories ───────────────────────────────────────────────────────

export const getCategories = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
        .query("projectCategories")
        .withIndex("by_user", q => q.eq("userId", args.userId))
        .collect();
  },
});

export const getCategory = query({
  args: { id: v.id("projectCategories") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getSubCategory = query({
  args: { id: v.id("projectSubCategories") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const addCategory = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    icon: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("projectCategories", {
      userId: args.userId,
      name: args.name,
      icon: args.icon,
      color: args.color,
    });
  },
});

export const updateCategory = mutation({
  args: {
    id: v.id("projectCategories"),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const deleteCategory = mutation({
  args: { id: v.id("projectCategories") },
  handler: async (ctx, args) => {
    // Delete all projects directly under this category
    const directProjects = await ctx.db
      .query("projects")
      .filter((q) => q.eq(q.field("categoryId"), args.id))
      .collect();
    
    for (const project of directProjects) {
      await deleteProjectRecursive(ctx, project._id);
    }

    // Delete all subcategories and their contents
    const subs = await ctx.db
      .query("projectSubCategories")
      .filter((q) => q.eq(q.field("categoryId"), args.id))
      .collect();

    for (const sub of subs) {
      const subProjects = await ctx.db
        .query("projects")
        .filter((q) => q.eq(q.field("subCategoryId"), sub._id))
        .collect();
      
      for (const project of subProjects) {
        await deleteProjectRecursive(ctx, project._id);
      }
      await ctx.db.delete(sub._id);
    }
    
    await ctx.db.delete(args.id);
  },
});

// ─── Project Sub-Categories ────────────────────────────────────────────────────

export const getSubCategories = query({
  args: { categoryId: v.id("projectCategories") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projectSubCategories")
      .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
      .collect();
  },
});

export const addSubCategory = mutation({
  args: {
    userId: v.id("users"),
    categoryId: v.id("projectCategories"),
    name: v.string(),
    icon: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("projectSubCategories", {
      userId: args.userId,
      categoryId: args.categoryId,
      name: args.name,
      icon: args.icon,
      color: args.color,
    });
  },
});

export const updateSubCategory = mutation({
  args: {
    id: v.id("projectSubCategories"),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const deleteSubCategory = mutation({
  args: { id: v.id("projectSubCategories") },
  handler: async (ctx, args) => {
    const projects = await ctx.db
      .query("projects")
      .filter((q) => q.eq(q.field("subCategoryId"), args.id))
      .collect();

    for (const project of projects) {
      await deleteProjectRecursive(ctx, project._id);
    }
    await ctx.db.delete(args.id);
  },
});

// ─── Projects ─────────────────────────────────────────────────────────────────

export const getProjectsBySubCategory = query({
  args: { subCategoryId: v.id("projectSubCategories") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_subCategory", (q) => q.eq("subCategoryId", args.subCategoryId))
      .collect();
  },
});

export const getProjectsByCategory = query({
  args: { categoryId: v.id("projectCategories") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
      .collect();
  },
});

export const getProject = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getProjectMetadata = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const projectId = ctx.db.normalizeId("projects", args.id);
    if (!projectId) return null;
    return await ctx.db.get(projectId);
  }
});

export const addProject = mutation({
  args: {
    userId: v.id("users"),
    categoryId: v.optional(v.id("projectCategories")),
    subCategoryId: v.optional(v.id("projectSubCategories")),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.string(),
    icon: v.string(),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("projects", {
      userId: args.userId,
      categoryId: args.categoryId,
      subCategoryId: args.subCategoryId,
      name: args.name,
      description: args.description,
      color: args.color,
      icon: args.icon,
      status: args.status || "active",
    });
  },
});

export const updateProject = mutation({
  args: {
    id: v.id("projects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const patch: Record<string, any> = {};
    if (fields.name !== undefined) patch.name = fields.name;
    if (fields.description !== undefined) patch.description = fields.description;
    if (fields.color !== undefined) patch.color = fields.color;
    if (fields.icon !== undefined) patch.icon = fields.icon;
    if (fields.status !== undefined) patch.status = fields.status;
    await ctx.db.patch(id, patch);
  },
});

async function deleteProjectRecursive(ctx: any, projectId: any) {
  // Delete resources
  const resources = await ctx.db
    .query("projectResources")
    .filter((q: any) => q.eq(q.field("projectId"), projectId))
    .collect();
  for (const res of resources) await ctx.db.delete(res._id);

  // Delete checklists
  const checklists = await ctx.db
    .query("projectChecklists")
    .filter((q: any) => q.eq(q.field("projectId"), projectId))
    .collect();
  for (const item of checklists) await ctx.db.delete(item._id);

  // Unlink tasks
  const tasks = await ctx.db
    .query("tasks")
    .filter((q: any) => q.eq(q.field("projectId"), projectId))
    .collect();
  for (const task of tasks) {
    await ctx.db.patch(task._id, { projectId: undefined });
  }

  await ctx.db.delete(projectId);
}

export const deleteProject = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    await deleteProjectRecursive(ctx, args.id);
  },
});

// ─── Project Resources ────────────────────────────────────────────────────────

export const getProjectResources = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projectResources")
      .filter((q) => q.eq(q.field("projectId"), args.projectId))
      .order("asc")
      .collect();
  },
});

export const addResource = mutation({
  args: {
    userId: v.id("users"),
    projectId: v.id("projects"),
    type: v.string(),
    title: v.string(),
    url: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("projectResources", {
      userId: args.userId,
      projectId: args.projectId,
      type: args.type,
      title: args.title,
      url: args.url,
      note: args.note,
    });
  },
});

export const deleteResource = mutation({
  args: { id: v.id("projectResources") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ─── Project Checklists ───────────────────────────────────────────────────────

export const getChecklists = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projectChecklists")
      .filter((q) => q.eq(q.field("projectId"), args.projectId))
      .collect();
  },
});

export const addChecklistItem = mutation({
  args: { 
    userId: v.id("users"),
    projectId: v.id("projects"), 
    text: v.string() 
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("projectChecklists", {
      userId: args.userId,
      projectId: args.projectId,
      text: args.text,
      isCompleted: false,
    });
  },
});

export const toggleChecklistItem = mutation({
  args: { id: v.id("projectChecklists") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) return;
    await ctx.db.patch(args.id, { isCompleted: !item.isCompleted });
  },
});

export const deleteChecklistItem = mutation({
  args: { id: v.id("projectChecklists") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ─── Todos linked to a project ────────────────────────────────────────────────

export const getTodosByProject = query({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("todos")
      .filter((q) => q.eq(q.field("projectId"), args.projectId))
      .order("desc")
      .collect();
  },
});
