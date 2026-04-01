import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import * as bcrypt from "bcryptjs";

export const createAnonymousUser = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.insert("users", {
      isAnonymous: true,
      language: "en",
      notificationsEnabled: true,
    });
  },
});

export const signUp = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
    anonymousId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    const hashedPassword = bcrypt.hashSync(args.password, 10);

    if (args.anonymousId) {
      // Upgrade existing anonymous user
      const user = await ctx.db.get(args.anonymousId);
      if (user && user.isAnonymous) {
        await ctx.db.patch(args.anonymousId, {
          email: args.email,
          password: hashedPassword,
          name: args.name,
          isAnonymous: false,
        });
        return args.anonymousId;
      }
    }

    // Create new full user
    const userId = await ctx.db.insert("users", {
      email: args.email,
      password: hashedPassword,
      name: args.name,
      language: "en",
      notificationsEnabled: true,
      isAnonymous: false,
    });

    return userId;
  },
});

export const signIn = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (!user || !user.password) {
      throw new Error("Invalid email or password");
    }

    const isValid = bcrypt.compareSync(args.password, user.password);

    if (!isValid) {
      throw new Error("Invalid email or password");
    }

    return user._id;
  },
});

export const getUserSettings = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    return {
      language: user.language || "en",
      notificationsEnabled: user.notificationsEnabled ?? true,
      name: user.name,
      email: user.email,
      isAnonymous: user.isAnonymous ?? false,
      profilePictureUrl: user.profilePictureUrl,
      profilePictureId: user.profilePictureId,
    };
  },
});

export const updateSettings = mutation({
  args: {
    userId: v.id("users"),
    language: v.optional(v.string()),
    notificationsEnabled: v.optional(v.boolean()),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, ...settings } = args;
    await ctx.db.patch(userId, settings);
  },
});

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const updateProfilePicture = mutation({
  args: {
    userId: v.id("users"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (user?.profilePictureId) {
      await ctx.storage.delete(user.profilePictureId);
    }
    const url = await ctx.storage.getUrl(args.storageId);
    await ctx.db.patch(args.userId, {
      profilePictureId: args.storageId,
      profilePictureUrl: url ?? undefined,
    });
  },
});
