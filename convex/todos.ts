import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const todos = await ctx.db
      .query("todos")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order('desc')
      .collect();
    return todos.filter((t) => !t.parentId);
  },
});

export const getSubtasks = query({
  args: { parentId: v.id("todos") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("todos")
      .withIndex("by_parent", (q) => q.eq("parentId", args.parentId))
      .order('desc')
      .collect();
  },
});

export const addTodo = mutation({
  args: { 
    userId: v.id("users"),
    text: v.string(),
    timerDuration: v.optional(v.number()),
    status: v.optional(v.string()),
    timerStartTime: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    projectId: v.optional(v.string()),
    date: v.optional(v.number()),
    parentId: v.optional(v.id("todos")),
  },
  handler: async (ctx, args) => {
    const todoId = await ctx.db.insert("todos", {
      userId: args.userId,
      text: args.text,
      status: args.status || "not_started",
      ...(args.timerDuration && { timerDuration: args.timerDuration }),
      ...(args.timerStartTime && { timerStartTime: args.timerStartTime }),
      ...(args.dueDate && { dueDate: args.dueDate }),
      ...(args.projectId && { projectId: args.projectId }),
      ...(args.date && { date: args.date }),
      ...(args.parentId && { parentId: args.parentId }),
    });
    return todoId;
  },
});

export const updateStatus = mutation({
  args: { id: v.id("todos"), status: v.string() },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.id);
    if (todo) {
      await ctx.db.patch(args.id, { status: args.status });
    }
  },
});

export const setTimer = mutation({
  args: { 
    id: v.id("todos"), 
    duration: v.optional(v.number()),
    dueDate: v.optional(v.number()), 
    date: v.optional(v.number()) 
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { 
      ...(args.duration !== undefined && { timerDuration: args.duration }),
      ...(args.dueDate !== undefined && { dueDate: args.dueDate }),
      ...(args.date !== undefined && { date: args.date })
    });
  },
});

export const startTimer = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.id);
    if (!todo) return;
    
    let newStartTime = Date.now();
    if (todo.status === "paused" && todo.timeLeftAtPause !== undefined && todo.timerDuration) {
        newStartTime = Date.now() - (todo.timerDuration - todo.timeLeftAtPause);
    }

    await ctx.db.patch(args.id, { 
      status: "in_progress",
      timerStartTime: newStartTime,
      timeLeftAtPause: undefined 
    });
  },
});

export const pauseTimer = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.id);
    if (!todo || todo.status !== "in_progress" || !todo.timerStartTime || !todo.timerDuration) return;

    const elapsed = Date.now() - todo.timerStartTime;
    const remaining = Math.max(0, todo.timerDuration - elapsed);

    await ctx.db.patch(args.id, {
      status: "paused",
      timeLeftAtPause: remaining
    });
  }
});

export const deleteTodo = mutation({
  args: { id: v.id('todos') },
  handler: async (ctx, args) => {
    const subtasks = await ctx.db
      .query("todos")
      .withIndex("by_parent", (q) => q.eq("parentId", args.id))
      .collect();
      
    for (const sub of subtasks) {
      await ctx.db.delete(sub._id);
    }
    await ctx.db.delete(args.id);
  }
})

export const updateTodo = mutation({
  args: {
    id: v.id('todos'),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      text: args.text,
    })
  }
})

export const linkProject = mutation({
  args: { id: v.id("todos"), projectId: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { projectId: args.projectId });
  },
});

export const updateDate = mutation({
  args: { id: v.id("todos"), date: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { date: args.date });
  },
});

export const clearAllTodos = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const todos = await ctx.db
      .query('todos')
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const todo of todos) {
      await ctx.db.delete(todo._id);
    }

    return { deletedCount: todos.length }
  }
})