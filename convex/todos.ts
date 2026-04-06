import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";


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
      .order('asc')
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const checkDuplicate = query({
  args: { 
    userId: v.id("users"), 
    text: v.string(), 
    dueDate: v.number() 
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("todos")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => 
        q.and(
          q.eq(q.field("text"), args.text),
          q.eq(q.field("dueDate"), args.dueDate)
        )
      )
      .first();
    return existing !== null;
  },
});



export const addTodo = mutation({
  args: { 
    userId: v.id("users"),
    text: v.string(),
    timerDuration: v.optional(v.number()),
    timerDirection: v.optional(v.string()),
    status: v.optional(v.string()),
    timerStartTime: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    projectId: v.optional(v.string()),
    date: v.optional(v.number()),
    parentId: v.optional(v.id("todos")),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    meetingLink: v.optional(v.string()),
    priority: v.optional(v.string()),
    categoryId: v.optional(v.id("projectCategories")),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const todoId = await ctx.db.insert("todos", {
      userId: args.userId,
      text: args.text,
      status: args.status || "not_started",
      ...(args.timerDuration && { timerDuration: args.timerDuration }),
      ...(args.timerDirection && { timerDirection: args.timerDirection }),
      ...(args.timerStartTime && { timerStartTime: args.timerStartTime }),
      ...(args.dueDate && { dueDate: args.dueDate }),
      ...(args.projectId && { projectId: args.projectId }),
      ...(args.date && { date: args.date }),
      ...(args.parentId && { parentId: args.parentId }),
      ...(args.description !== undefined && { description: args.description }),
      ...(args.location !== undefined && { location: args.location }),
      ...(args.meetingLink !== undefined && { meetingLink: args.meetingLink }),
      ...(args.priority !== undefined && { priority: args.priority }),
      ...(args.categoryId !== undefined && { categoryId: args.categoryId }),
      ...(args.type !== undefined && { type: args.type }),
    });
    return todoId;
  },
});

export const updateStatus = mutation({
  args: { id: v.id("todos"), status: v.string() },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.id);
    if (!todo) return;
    
    await ctx.db.patch(args.id, { status: args.status });

    // If a parent is marked done or not_done or paused, cascade to subtasks.
    if (args.status === "done" || args.status === "not_done" || args.status === "paused" || args.status === "not_started") {
      const subtasks = await ctx.db
        .query("todos")
        .withIndex("by_parent", (q) => q.eq("parentId", args.id))
        .collect();
      
      for (const sub of subtasks) {
        if (sub.status === "in_progress") {
          // If pausing parent, pause running subtasks
          if (args.status === "paused") {
            if (sub.timerStartTime && sub.timerDuration) {
              const subElapsed = Date.now() - sub.timerStartTime;
              const subRemaining = Math.max(0, sub.timerDuration - subElapsed);
              await ctx.db.patch(sub._id, { status: "paused", timeLeftAtPause: subRemaining });
            } else {
              await ctx.db.patch(sub._id, { status: "paused" });
            }
          } else {
            // For done/not_done/not_started, just align status
            await ctx.db.patch(sub._id, { status: args.status });
          }
        }
      }
    }
  },
});

export const setTimer = mutation({
  args: { 
    id: v.id("todos"), 
    duration: v.optional(v.number()),
    timerDirection: v.optional(v.string()),
    dueDate: v.optional(v.number()), 
    date: v.optional(v.number()) 
  },
  handler: async (ctx, args) => {
    // If this is a subtask, validate against parent budget
    if (args.duration !== undefined) {
      const todo = await ctx.db.get(args.id);
      if (todo?.parentId) {
        const parent = await ctx.db.get(todo.parentId);
        if (parent?.timerDuration) {
          const siblings = await ctx.db
            .query("todos")
            .withIndex("by_parent", (q) => q.eq("parentId", todo.parentId!))
            .collect();
          const otherSubtasksDuration = siblings
            .filter((s) => s._id !== args.id)
            .reduce((sum, s) => sum + (s.timerDuration || 0), 0);
          if (otherSubtasksDuration + args.duration > parent.timerDuration) {
            throw new Error(
              `Subtask timer exceeds budget. Available: ${Math.floor((parent.timerDuration - otherSubtasksDuration) / 60000)} minutes.`
            );
          }
        }
      }
    }

    await ctx.db.patch(args.id, { 
      ...(args.duration !== undefined && { timerDuration: args.duration }),
      ...(args.timerDirection !== undefined && { timerDirection: args.timerDirection }),
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

    // Cascade pause to any running subtasks
    const subtasks = await ctx.db
      .query("todos")
      .withIndex("by_parent", (q) => q.eq("parentId", args.id))
      .collect();

    for (const sub of subtasks) {
      if (sub.status === "in_progress" && sub.timerStartTime && sub.timerDuration) {
        const subElapsed = Date.now() - sub.timerStartTime;
        const subRemaining = Math.max(0, sub.timerDuration - subElapsed);
        await ctx.db.patch(sub._id, {
          status: "paused",
          timeLeftAtPause: subRemaining
        });
      }
    }
  }
});

// Start a subtask timer and sync the parent timer
export const startSubtaskTimer = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => {
    const sub = await ctx.db.get(args.id);
    if (!sub || !sub.parentId || !sub.timerDuration) return;

    // Start subtask timer
    let subStartTime = Date.now();
    if (sub.status === "paused" && sub.timeLeftAtPause !== undefined) {
      subStartTime = Date.now() - (sub.timerDuration - sub.timeLeftAtPause);
    }
    await ctx.db.patch(args.id, {
      status: "in_progress",
      timerStartTime: subStartTime,
      timeLeftAtPause: undefined,
    });

    // Auto-start parent if not already running
    const parent = await ctx.db.get(sub.parentId);
    if (parent && parent.status !== "in_progress" && parent.timerDuration) {
      let parentStartTime = Date.now();
      if (parent.status === "paused" && parent.timeLeftAtPause !== undefined) {
        parentStartTime = Date.now() - (parent.timerDuration - parent.timeLeftAtPause);
      }
      await ctx.db.patch(sub.parentId, {
        status: "in_progress",
        timerStartTime: parentStartTime,
        timeLeftAtPause: undefined,
      });
    }
  },
});

// Pause a subtask timer and conditionally pause parent
export const pauseSubtaskTimer = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => {
    const sub = await ctx.db.get(args.id);
    if (!sub || !sub.parentId || sub.status !== "in_progress" || !sub.timerStartTime || !sub.timerDuration) return;

    // Pause subtask
    const elapsed = Date.now() - sub.timerStartTime;
    const remaining = Math.max(0, sub.timerDuration - elapsed);
    await ctx.db.patch(args.id, {
      status: "paused",
      timeLeftAtPause: remaining,
    });

    // Check if any sibling subtasks are still running
    const siblings = await ctx.db
      .query("todos")
      .withIndex("by_parent", (q) => q.eq("parentId", sub.parentId!))
      .collect();
    const anyStillRunning = siblings.some(
      (s) => s._id !== args.id && s.status === "in_progress"
    );

    // If no siblings running, pause parent too
    if (!anyStillRunning) {
      const parent = await ctx.db.get(sub.parentId);
      if (parent && parent.status === "in_progress" && parent.timerStartTime && parent.timerDuration) {
        const parentElapsed = Date.now() - parent.timerStartTime;
        const parentRemaining = Math.max(0, parent.timerDuration - parentElapsed);
        await ctx.db.patch(sub.parentId, {
          status: "paused",
          timeLeftAtPause: parentRemaining,
        });
      }
    }
  },
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
    text: v.optional(v.string()),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    meetingLink: v.optional(v.string()),
    priority: v.optional(v.string()),
    timerDirection: v.optional(v.string()),
    categoryId: v.optional(v.id("projectCategories")),
    type: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    date: v.optional(v.number()),
    userId: v.optional(v.id("users")),
    isCompleted: v.optional(v.boolean()),
    status: v.optional(v.string()),
    timerDuration: v.optional(v.number()),
    timerStartTime: v.optional(v.number()),
    timeLeftAtPause: v.optional(v.number()),
    projectId: v.optional(v.string()),
    parentId: v.optional(v.id("todos")),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
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