
import { mutation } from "./_generated/server";

export const seed = mutation({
    args: {},
    handler: async (ctx) => {
        // Clear existing data (optional, for dev)
        const existingFlows = await ctx.db.query("flows").collect();
        for (const flow of existingFlows) {
            await ctx.db.delete(flow._id);
        }
        const existingTables = await ctx.db.query("tables").collect();
        for (const table of existingTables) {
            await ctx.db.delete(table._id);
        }

        // Seed Flows
        await ctx.db.insert("flows", {
            name: 'Order Processing - V2',
            type: 'Cloud Flow',
            status: 'Active',
            logic: { trigger: 'When a row is added', steps: 12 },
            connRefs: 2,
            tenantId: "seed-tenant",
            workflowId: "seed-flow-1",
            lastSynced: Date.now()
        });
        await ctx.db.insert("flows", {
            name: 'Notify Account Manager',
            type: 'Cloud Flow',
            status: 'Active',
            logic: { trigger: 'Recurrence', steps: 4 },
            connRefs: 1,
            tenantId: "seed-tenant",
            workflowId: "seed-flow-2",
            lastSynced: Date.now()
        });
        await ctx.db.insert("flows", {
            name: 'Sync Legacy Data',
            type: 'Cloud Flow',
            status: 'Warning',
            logic: { trigger: 'Manual', steps: 45 },
            connRefs: 4,
            tenantId: "seed-tenant",
            workflowId: "seed-flow-3",
            lastSynced: Date.now()
        });

        // Seed Tables
        await ctx.db.insert("tables", {
            tenantId: "seed-tenant",
            name: 'Project',
            logicalName: 'cr81_project',
            entitySetName: 'cr81_projects',
            columns: 24,
            lastSynced: Date.now()
        });
        await ctx.db.insert("tables", {
            tenantId: "seed-tenant",
            name: 'Account',
            logicalName: 'account',
            entitySetName: 'accounts',
            columns: 140,
            lastSynced: Date.now()
        });
    },
});
