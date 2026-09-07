import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { insertWithLocalId } from "./idempotency";

// ─── Project Categories ───────────────────────────────────────────────────────

export const getCategories = query({
  args: { userId: v.union(v.id("users"), v.string()) },
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
    userId: v.union(v.id("users"), v.string()),
    name: v.string(),
    icon: v.string(),
    color: v.string(),
    description: v.optional(v.string()),
    tag: v.optional(v.string()),
    goalId: v.optional(v.id("yearlyGoals")),
    localId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { localId, ...fields } = args;
    return await insertWithLocalId(ctx, "projectCategories", localId, fields);
  },
});

export const updateCategory = mutation({
  args: {
    id: v.id("projectCategories"),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    description: v.optional(v.string()),
    tag: v.optional(v.string()),
    goalId: v.optional(v.id("yearlyGoals")),
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

    // Delete all category items (checklists, bullets, toggles)
    const categoryItems = await ctx.db
      .query("categoryItems")
      .withIndex("by_category_type", (q) => q.eq("categoryId", args.id))
      .collect();
    for (const item of categoryItems) {
      await ctx.db.delete(item._id);
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
    userId: v.union(v.id("users"), v.string()),
    categoryId: v.id("projectCategories"),
    name: v.string(),
    icon: v.string(),
    color: v.string(),
    localId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { localId, ...fields } = args;
    return await insertWithLocalId(ctx, "projectSubCategories", localId, fields);
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

    // Delete all category items linked to this sub-category
    const subCategoryItems = await ctx.db
      .query("categoryItems")
      .withIndex("by_subCategory_type", (q) => q.eq("subCategoryId", args.id))
      .collect();
    for (const item of subCategoryItems) {
      await ctx.db.delete(item._id);
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
    userId: v.union(v.id("users"), v.string()),
    categoryId: v.optional(v.id("projectCategories")),
    subCategoryId: v.optional(v.id("projectSubCategories")),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.string(),
    icon: v.string(),
    status: v.optional(v.string()),
    goalId: v.optional(v.id("yearlyGoals")),
    localId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { localId, ...fields } = args;
    return await insertWithLocalId(ctx, "projects", localId, {
      ...fields,
      status: fields.status || "active",
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
    goalId: v.optional(v.id("yearlyGoals")),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const patch: Record<string, any> = {};
    if (fields.name !== undefined) patch.name = fields.name;
    if (fields.description !== undefined) patch.description = fields.description;
    if (fields.color !== undefined) patch.color = fields.color;
    if (fields.icon !== undefined) patch.icon = fields.icon;
    if (fields.status !== undefined) patch.status = fields.status;
    if (fields.goalId !== undefined) patch.goalId = fields.goalId;
    await ctx.db.patch(id, patch);
  },
});

export const linkProjectToGoal = mutation({
  args: {
    id: v.id("projects"),
    goalId: v.optional(v.id("yearlyGoals")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { goalId: args.goalId });
  },
});

export const linkCategoryToGoal = mutation({
  args: {
    id: v.id("projectCategories"),
    goalId: v.optional(v.id("yearlyGoals")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { goalId: args.goalId });
  },
});

export const getProjectsByGoal = query({
  args: { goalId: v.id("yearlyGoals") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
      .collect();
  },
});

export const getCategoriesByGoal = query({
  args: { goalId: v.id("yearlyGoals") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projectCategories")
      .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
      .collect();
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
    userId: v.union(v.id("users"), v.string()),
    projectId: v.id("projects"),
    type: v.string(),
    title: v.string(),
    url: v.optional(v.string()),
    note: v.optional(v.string()),
    localId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { localId, ...fields } = args;
    return await insertWithLocalId(ctx, "projectResources", localId, fields);
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
    userId: v.union(v.id("users"), v.string()),
    projectId: v.id("projects"), 
    text: v.string(),
    localId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { localId, ...fields } = args;
    return await insertWithLocalId(ctx, "projectChecklists", localId, {
      ...fields,
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

// ─── Category Items (Checklists, Bullets, Toggles) ────────────────────────────

export const getCategoryItems = query({
  args: {
    categoryId: v.optional(v.id("projectCategories")),
    subCategoryId: v.optional(v.id("projectSubCategories")),
    listType: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.subCategoryId) {
      return await ctx.db
        .query("categoryItems")
        .withIndex("by_subCategory_type", (q) =>
          q.eq("subCategoryId", args.subCategoryId).eq("listType", args.listType)
        )
        .order("asc")
        .collect();
    }
    return await ctx.db
      .query("categoryItems")
      .withIndex("by_category_type", (q) =>
        q.eq("categoryId", args.categoryId).eq("listType", args.listType)
      )
      .order("asc")
      .collect();
  },
});

export const addCategoryItem = mutation({
  args: {
    userId: v.union(v.id("users"), v.string()),
    categoryId: v.optional(v.id("projectCategories")),
    subCategoryId: v.optional(v.id("projectSubCategories")),
    listType: v.string(),
    text: v.string(),
    content: v.optional(v.string()),
    localId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { localId, ...rest } = args;
    return await insertWithLocalId(ctx, "categoryItems", localId, {
      ...rest,
      isCompleted: false,
      isExpanded: args.listType === "toggle" ? false : undefined,
      order: Date.now(),
    });
  },
});

export const updateCategoryItem = mutation({
  args: {
    id: v.id("categoryItems"),
    text: v.optional(v.string()),
    content: v.optional(v.string()),
    isCompleted: v.optional(v.boolean()),
    isExpanded: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const patch: Record<string, any> = {};
    if (fields.text !== undefined) patch.text = fields.text;
    if (fields.content !== undefined) patch.content = fields.content;
    if (fields.isCompleted !== undefined) patch.isCompleted = fields.isCompleted;
    if (fields.isExpanded !== undefined) patch.isExpanded = fields.isExpanded;
    await ctx.db.patch(id, patch);
  },
});

export const deleteCategoryItem = mutation({
  args: { id: v.id("categoryItems") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ─── Planner List Items ───────────────────────────────────────────────────────

export const getPlannerItems = query({
  args: {
    userId: v.union(v.id("users"), v.string()),
    date: v.number(),
    listType: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("categoryItems")
      .withIndex("by_date_type", (q) =>
        q.eq("date", args.date).eq("listType", args.listType)
      )
      .order("asc")
      .collect();
  },
});

export const addPlannerItem = mutation({
  args: {
    userId: v.union(v.id("users"), v.string()),
    date: v.number(),
    listType: v.string(),
    text: v.string(),
    content: v.optional(v.string()),
    localId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { localId, ...rest } = args;
    return await insertWithLocalId(ctx, "categoryItems", localId, {
      ...rest,
      isCompleted: false,
      isExpanded: args.listType === "toggle" ? false : undefined,
      order: Date.now(),
    });
  },
});

export const updatePlannerItem = mutation({
  args: {
    id: v.id("categoryItems"),
    text: v.optional(v.string()),
    content: v.optional(v.string()),
    isCompleted: v.optional(v.boolean()),
    isExpanded: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const patch: Record<string, any> = {};
    if (fields.text !== undefined) patch.text = fields.text;
    if (fields.content !== undefined) patch.content = fields.content;
    if (fields.isCompleted !== undefined) patch.isCompleted = fields.isCompleted;
    if (fields.isExpanded !== undefined) patch.isExpanded = fields.isExpanded;
    await ctx.db.patch(id, patch);
  },
});

export const deletePlannerItem = mutation({
  args: { id: v.id("categoryItems") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
