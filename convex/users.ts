import { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { internalMutation, query, mutation } from "./_generated/server";

/**
 * Stores a user in the database.
 * Called after a user logs in via Clerk.
 * Access is granted to all authenticated users — data isolation
 * is handled by Clerk Organizations (each org sees only its own tenants).
 */
export const store = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Called storeUser without authentication present");
        }

        // Check if user is already in the database
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (user !== null) {
            // Update existing user
            if (user.name !== identity.name || user.email !== identity.email || !user.isAllowed) {
                await ctx.db.patch(user._id, {
                    name: identity.name!,
                    email: identity.email!,
                    isAllowed: true,
                });
            }
            return user._id;
        }

        // Create new user — all authenticated users are allowed
        return await ctx.db.insert("users", {
            name: identity.name!,
            email: identity.email!,
            tokenIdentifier: identity.tokenIdentifier,
            orgIds: [],
            isAllowed: true,
        });
    },
});

/**
 * Checks if the current user is allowed to access the app.
 */
export const syncUser = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        return user;
    }
});
