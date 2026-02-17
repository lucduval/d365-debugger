
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// --- Mutations ---

export const saveDocumentation = mutation({
    args: {
        flowId: v.id("flows"),
        content: v.string(),
        status: v.string(), // 'draft' | 'published'
        confluencePageId: v.optional(v.string()),
        confluenceUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existingDoc = await ctx.db
            .query("flow_documentation")
            .withIndex("by_flowId", (q) => q.eq("flowId", args.flowId))
            .first();

        if (existingDoc) {
            await ctx.db.patch(existingDoc._id, {
                content: args.content,
                status: args.status,
                confluencePageId: args.confluencePageId ?? existingDoc.confluencePageId,
                confluenceUrl: args.confluenceUrl ?? existingDoc.confluenceUrl,
                lastUpdated: Date.now(),
            });
        } else {
            await ctx.db.insert("flow_documentation", {
                flowId: args.flowId,
                content: args.content,
                status: args.status,
                confluencePageId: args.confluencePageId,
                confluenceUrl: args.confluenceUrl,
                lastUpdated: Date.now(),
            });
        }
    },
});

export const saveConfluenceSettings = mutation({
    args: {
        domain: v.string(),
        email: v.string(),
        apiToken: v.string(),
        spaceKey: v.string(),
        parentId: v.optional(v.string()), // Optional parent page ID
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const userId = identity.tokenIdentifier;

        const existingSettings = await ctx.db
            .query("confluence_settings")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        if (existingSettings) {
            await ctx.db.patch(existingSettings._id, {
                domain: args.domain,
                email: args.email,
                apiToken: args.apiToken,
                spaceKey: args.spaceKey,
                parentId: args.parentId,
            });
        } else {
            await ctx.db.insert("confluence_settings", {
                userId,
                domain: args.domain,
                email: args.email,
                apiToken: args.apiToken,
                spaceKey: args.spaceKey,
                parentId: args.parentId,
            });
        }
    },
});

// --- Queries ---

export const getDocumentation = query({
    args: { flowId: v.id("flows") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("flow_documentation")
            .withIndex("by_flowId", (q) => q.eq("flowId", args.flowId))
            .first();
    },
});

export const getConfluenceSettings = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        return await ctx.db
            .query("confluence_settings")
            .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
            .first();
    },
});
