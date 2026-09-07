import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { api } from "./_generated/api";

// ─── Helper: Clean hashtag name ──────────────────────────────────────────────
function cleanTag(name: string): string {
  return name.replace(/^#/, "").toLowerCase().trim();
}

// ─── Helper: Get or create topic node ────────────────────────────────────────
async function getOrCreateTopicNode(
  ctx: any,
  userId: any,
  name: string,
  type: "hashtag" | "project" | "inferred" | "goal",
  sourceRef?: any
): Promise<any> {
  const cleanName = cleanTag(name);
  
  const existing = await ctx.db
    .query("topicNodes")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .filter((q: any) => q.and(
      q.eq(q.field("name"), cleanName),
      q.eq(q.field("type"), type)
    ))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      totalOccurrences: existing.totalOccurrences + 1,
      lastActivityAt: Date.now(),
      activeTodos: existing.activeTodos + 1,
    });
    return existing;
  }

  const newId = await ctx.db.insert("topicNodes", {
    userId,
    name: cleanName,
    displayName: name.startsWith("#") ? name : `#${name}`,
    type,
    sourceRef,
    totalOccurrences: 1,
    activeTodos: 1,
    completedTodos: 0,
    lastActivityAt: Date.now(),
    firstSeenAt: Date.now(),
    sentimentScore: 0,
    momentum: 0,
    consistency: 0,
  });

  return { _id: newId, name: cleanName, displayName: name.startsWith("#") ? name : `#${name}`, type };
}

// ─── Helper: Upsert topic edge ───────────────────────────────────────────────
async function upsertTopicEdge(
  ctx: any,
  userId: any,
  fromName: string,
  toName: string,
  edgeType: "contains" | "co_occurs" | "sequence" | "subtopic" | "conflict",
  weightIncrement: number
) {
  const [fromNode, toNode] = await Promise.all([
    getOrCreateTopicNode(ctx, userId, fromName, "hashtag"),
    getOrCreateTopicNode(ctx, userId, toName, "hashtag"),
  ]);

  if (!fromNode || !toNode || fromNode._id === toNode._id) return;

  const existing = await ctx.db
    .query("topicEdges")
    .withIndex("by_from", (q: any) => q.eq("fromTopicId", fromNode._id))
    .filter((q: any) => q.and(
      q.eq(q.field("toTopicId"), toNode._id),
      q.eq(q.field("edgeType"), edgeType)
    ))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      weight: Math.min(1, existing.weight + weightIncrement * 0.1),
      evidenceCount: existing.evidenceCount + 1,
    });
  } else {
    await ctx.db.insert("topicEdges", {
      userId,
      fromTopicId: fromNode._id,
      toTopicId: toNode._id,
      edgeType,
      weight: weightIncrement,
      evidenceCount: 1,
    });
  }
}

// ─── Mutation: Process hashtags for a todo (called from addTodo/updateTodo) ───
export const processTodoHashtags = internalMutation({
  args: {
    userId: v.union(v.id("users"), v.string()),
    todoId: v.id("todos"),
    hashtags: v.optional(v.array(v.string())),
    projectId: v.optional(v.string()),
    categoryId: v.optional(v.id("projectCategories")),
    subCategoryId: v.optional(v.id("projectSubCategories")),
    isNew: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (!args.hashtags || args.hashtags.length === 0) return;

    const cleanHashtags = args.hashtags.map(cleanTag).filter(Boolean);
    if (cleanHashtags.length === 0) return;

    // 1. Ensure topic nodes exist for each hashtag
    for (const tag of cleanHashtags) {
      await getOrCreateTopicNode(ctx, args.userId, tag, "hashtag");
    }

    // 2. Check for project/category matches via tag field
    for (const tag of cleanHashtags) {
      // Find categories with matching tag
      const matchingCategories = await ctx.db
        .query("projectCategories")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) => q.eq(q.field("tag"), tag))
        .collect();

      for (const cat of matchingCategories) {
        // Auto-link todo to category if not already linked
        if (!args.categoryId && !args.isNew) {
          await ctx.db.patch(args.todoId, { categoryId: cat._id });
        }
        // Create/strengthen topic edge
        await upsertTopicEdge(ctx, args.userId, `hashtag:${tag}`, `category:${cat._id}`, "contains", 1);

        // Also link to all projects in this category
        const projectsInCat = await ctx.db
          .query("projects")
          .withIndex("by_category", (q) => q.eq("categoryId", cat._id))
          .collect();

        for (const proj of projectsInCat) {
          await upsertTopicEdge(ctx, args.userId,
            `hashtag:${tag}`, `project:${proj._id}`, "contains", 0.8);
        }
      }
    }

    // 3. Co-occurrence analysis (hashtags used together)
    for (let i = 0; i < cleanHashtags.length; i++) {
      for (let j = i + 1; j < cleanHashtags.length; j++) {
        await upsertTopicEdge(ctx, args.userId,
          `hashtag:${cleanHashtags[i]}`,
          `hashtag:${cleanHashtags[j]}`,
          "co_occurs", 0.5);
      }
    }

    // 4. Link to project if todo has projectId
    if (args.projectId) {
      for (const tag of cleanHashtags) {
        await upsertTopicEdge(ctx, args.userId,
          `hashtag:${tag}`, `project:${args.projectId}`, "contains", 0.8);
      }
    }

    // 4. Link to category/subcategory if present
    if (args.categoryId) {
      for (const tag of cleanHashtags) {
        await upsertTopicEdge(ctx, args.userId,
          `hashtag:${tag}`, `category:${args.categoryId}`, "contains", 0.9);
      }
    }
    if (args.subCategoryId) {
      for (const tag of cleanHashtags) {
        await upsertTopicEdge(ctx, args.userId,
          `hashtag:${tag}`, `subcategory:${args.subCategoryId}`, "contains", 0.9);
      }
    }
  },
});

// ─── Query: Get topic nodes for user ─────────────────────────────────────────
export const getTopicNodes = query({
  args: { 
    userId: v.union(v.id("users"), v.string()),
    type: v.optional(v.union(
      v.literal("hashtag"),
      v.literal("project"),
      v.literal("inferred"),
      v.literal("goal")
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let queryBuilder = ctx.db.query("topicNodes").withIndex("by_user", (q) => q.eq("userId", args.userId));
    
    if (args.type) {
      queryBuilder = queryBuilder.filter((q) => q.eq(q.field("type"), args.type));
    }
    
    const topics = await queryBuilder
      .order("desc")
      .collect();

    if (args.limit) {
      return topics.slice(0, args.limit);
    }
    return topics;
  },
});

// ─── Query: Get topic edges for user ─────────────────────────────────────────
export const getTopicEdges = query({
  args: { userId: v.union(v.id("users"), v.string()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("topicEdges")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// ─── Query: Get related topics for a given topic ─────────────────────────────
export const getRelatedTopics = query({
  args: { 
    userId: v.union(v.id("users"), v.string()),
    topicId: v.id("topicNodes"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const edges = await ctx.db
      .query("topicEdges")
      .withIndex("by_from", (q) => q.eq("fromTopicId", args.topicId))
      .collect();

    const related = [];
    for (const edge of edges) {
      const toTopic = await ctx.db.get(edge.toTopicId);
      if (toTopic) {
        related.push({
          ...toTopic,
          edgeWeight: edge.weight,
          edgeType: edge.edgeType,
          evidenceCount: edge.evidenceCount,
        });
      }
    }

    related.sort((a, b) => b.edgeWeight - a.edgeWeight);
    return args.limit ? related.slice(0, args.limit) : related;
  },
});

// ─── Mutation: Update topic metrics on todo completion ───────────────────────
export const updateTopicOnCompletion = internalMutation({
  args: {
    userId: v.union(v.id("users"), v.string()),
    todoId: v.id("todos"),
    hashtags: v.optional(v.array(v.string())),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (!args.hashtags || args.hashtags.length === 0) return;

    for (const tag of args.hashtags.map(cleanTag).filter(Boolean)) {
      const topic = await ctx.db
        .query("topicNodes")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) => q.and(
          q.eq(q.field("name"), tag),
          q.eq(q.field("type"), "hashtag")
        ))
        .first();

      if (topic) {
        await ctx.db.patch(topic._id, {
          activeTodos: Math.max(0, topic.activeTodos - (args.completed ? 0 : 1)),
          completedTodos: topic.completedTodos + (args.completed ? 1 : 0),
          lastActivityAt: Date.now(),
        });
      }
    }
  },
});

// ─── Mutation: Create inferred topic from AI analysis ────────────────────────
export const createInferredTopic = internalMutation({
  args: {
    userId: v.union(v.id("users"), v.string()),
    name: v.string(),
    displayName: v.string(),
    sourceTodos: v.array(v.id("todos")),
  },
  handler: async (ctx, args) => {
    const cleanName = cleanTag(args.name);
    
    const existing = await ctx.db
      .query("topicNodes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.and(
        q.eq(q.field("name"), cleanName),
        q.eq(q.field("type"), "inferred")
      ))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        totalOccurrences: existing.totalOccurrences + args.sourceTodos.length,
        lastActivityAt: Date.now(),
        activeTodos: existing.activeTodos + args.sourceTodos.length,
      });
      return existing._id;
    }

    return await ctx.db.insert("topicNodes", {
      userId: args.userId,
      name: cleanName,
      displayName: args.displayName,
      type: "inferred",
      totalOccurrences: args.sourceTodos.length,
      activeTodos: args.sourceTodos.length,
      completedTodos: 0,
      lastActivityAt: Date.now(),
      firstSeenAt: Date.now(),
      sentimentScore: 0,
      momentum: 0,
      consistency: 0,
    });
  },
});

// ─── Query: Match Hashtag to Existing Spaces, Projects, or Goals ──────────────
export const matchHashtag = query({
  args: {
    userId: v.union(v.id("users"), v.string()),
    tag: v.string(),
  },
  handler: async (ctx, args) => {
    const rawTag = args.tag.trim();
    const clean = rawTag.replace(/^#/, "").toLowerCase().trim();
    if (!clean) return null;

    // 1. Check Spaces (projectCategories) by tag or name
    const categories = await ctx.db
      .query("projectCategories")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const cat of categories) {
      const catTag = cat.tag ? cat.tag.replace(/^#/, "").toLowerCase().trim() : "";
      const catName = cat.name.toLowerCase().trim();
      if (catTag === clean || catName === clean) {
        return {
          match: true,
          entityType: "space" as const,
          id: cat._id,
          name: cat.name,
          color: cat.color,
          icon: cat.icon,
          tag: cat.tag || `#${cat.name.toLowerCase().replace(/\s+/g, "")}`,
        };
      }
    }

    // 2. Check Projects by name
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const proj of projects) {
      const projName = proj.name.toLowerCase().trim();
      if (projName === clean) {
        return {
          match: true,
          entityType: "project" as const,
          id: proj._id,
          name: proj.name,
          color: proj.color,
          icon: proj.icon,
          categoryId: proj.categoryId,
        };
      }
    }

    // 3. Check Goals by tag, category, or title keyword
    const goals = await ctx.db
      .query("yearlyGoals")
      .withIndex("by_user_year", (q) => q.eq("userId", args.userId))
      .take(100);

    for (const g of goals) {
      const gTag = g.tag ? g.tag.replace(/^#/, "").toLowerCase().trim() : "";
      const gCat = g.category ? g.category.toLowerCase().trim() : "";
      if (gTag === clean || gCat === clean) {
        return {
          match: true,
          entityType: "goal" as const,
          id: g._id,
          name: g.text,
          color: g.color,
          icon: g.icon,
        };
      }
    }

    return null;
  },
});

// ─── Query: Get All Cross-Link Entities ──────────────────────────────────────
export const getAllCrossLinkEntities = query({
  args: {
    userId: v.union(v.id("users"), v.string()),
  },
  handler: async (ctx, args) => {
    const [spaces, projects, goals] = await Promise.all([
      ctx.db
        .query("projectCategories")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect(),
      ctx.db
        .query("projects")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect(),
      ctx.db
        .query("yearlyGoals")
        .withIndex("by_user_year", (q) => q.eq("userId", args.userId))
        .order("desc")
        .take(200),
    ]);

    return {
      spaces: spaces.map((s) => ({
        id: s._id,
        name: s.name,
        color: s.color,
        icon: s.icon,
        tag: s.tag,
        goalId: s.goalId,
      })),
      projects: projects.map((p) => ({
        id: p._id,
        name: p.name,
        color: p.color,
        icon: p.icon,
        categoryId: p.categoryId,
        subCategoryId: p.subCategoryId,
        goalId: p.goalId,
      })),
      goals: goals.map((g) => ({
        id: g._id,
        year: g.year,
        month: g.month,
        day: g.day,
        text: g.text,
        color: g.color,
        icon: g.icon,
        category: g.category,
        categoryId: g.categoryId,
        projectId: g.projectId,
        isCompleted: g.isCompleted,
      })),
    };
  },
});