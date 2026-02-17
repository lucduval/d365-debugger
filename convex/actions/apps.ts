"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
const { api } = require("../_generated/api") as any;

async function getAccessToken(resource: string, clientId: string, clientSecret: string, tenantDirectoryId?: string): Promise<string> {
    const authorityHostUrl = "https://login.microsoftonline.com";
    const tenant = tenantDirectoryId || "common";
    const authorityUrl = `${authorityHostUrl}/${tenant}/oauth2/v2.0/token`;

    const body = new URLSearchParams();
    body.append("scope", `https://${resource}/.default`);
    body.append("client_id", clientId);
    body.append("client_secret", clientSecret);
    body.append("grant_type", "client_credentials");

    const response = await fetch(authorityUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString()
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error_description);
    return data.access_token;
}

function resolveTenant(tenants: any[], tenantId: string) {
    const tenant = tenants.find((t: any) => t.tenantId === tenantId);
    if (!tenant) throw new Error("Tenant not found");
    const sanitizedUrl = tenant.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return { tenant, sanitizedUrl };
}

export const listModelDrivenApps = action({
    args: { tenantId: v.string(), orgId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const tenants = await ctx.runQuery(api.queries.getTenants, { orgId: args.orgId });
        const { tenant, sanitizedUrl } = resolveTenant(tenants, args.tenantId);
        const token = await getAccessToken(sanitizedUrl, tenant.clientId, tenant.clientSecret, tenant.tenantDirectoryId);

        const url = `https://${sanitizedUrl}/api/data/v9.2/appmodules?$select=name,uniquename,appmoduleversion,publishedon,description,clienttype,ismanaged&$orderby=name asc`;

        console.log(`[listModelDrivenApps] Fetching from: ${url}`);

        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[listModelDrivenApps] Error ${response.status}: ${errorText}`);
            throw new Error(`Failed to fetch model-driven apps: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        const mapped = data.value.map((app: any) => ({
            appModuleId: app.appmoduleid,
            name: app.name,
            uniqueName: app.uniquename || undefined,
            description: app.description || undefined,
            appVersion: app.appmoduleversion || undefined,
            publishedOn: app.publishedon || undefined,
            clientType: app.clienttype ?? undefined,
            isManaged: app.ismanaged ?? false,
        }));

        console.log(`[listModelDrivenApps] Found ${mapped.length} apps`);

        const BATCH_SIZE = 50;
        for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
            const batch = mapped.slice(i, i + BATCH_SIZE);
            await ctx.runMutation(api.mutations.upsertModelDrivenApps, {
                tenantId: args.tenantId,
                apps: batch
            });
        }

        return mapped;
    },
});

export const listSystemForms = action({
    args: { tenantId: v.string(), orgId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const tenants = await ctx.runQuery(api.queries.getTenants, { orgId: args.orgId });
        const { tenant, sanitizedUrl } = resolveTenant(tenants, args.tenantId);
        const token = await getAccessToken(sanitizedUrl, tenant.clientId, tenant.clientSecret, tenant.tenantDirectoryId);

        // Only custom forms, main form types (2=Main, 6=Quick View, 7=Quick Create, 5=Mobile, 11=Main Interactive)
        const url = `https://${sanitizedUrl}/api/data/v9.2/systemforms?$select=name,objecttypecode,type,description,ismanaged&$filter=ismanaged eq false and (type eq 2 or type eq 6 or type eq 7)&$orderby=objecttypecode,name asc`;

        console.log(`[listSystemForms] Fetching from: ${url}`);

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
                Prefer: 'odata.maxpagesize=5000'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[listSystemForms] Error ${response.status}: ${errorText}`);
            throw new Error(`Failed to fetch system forms: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        const mapped = data.value.map((form: any) => ({
            formId: form.formid,
            name: form.name,
            entityLogicalName: form.objecttypecode,
            formType: form.type,
            description: form.description || undefined,
            isManaged: form.ismanaged ?? false,
        }));

        console.log(`[listSystemForms] Found ${mapped.length} custom forms`);

        const BATCH_SIZE = 100;
        for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
            const batch = mapped.slice(i, i + BATCH_SIZE);
            await ctx.runMutation(api.mutations.upsertSystemForms, {
                tenantId: args.tenantId,
                forms: batch
            });
        }

        return mapped;
    },
});

export const listSystemViews = action({
    args: { tenantId: v.string(), orgId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const tenants = await ctx.runQuery(api.queries.getTenants, { orgId: args.orgId });
        const { tenant, sanitizedUrl } = resolveTenant(tenants, args.tenantId);
        const token = await getAccessToken(sanitizedUrl, tenant.clientId, tenant.clientSecret, tenant.tenantDirectoryId);

        // Only custom views, public views (querytype 0) and associated views (querytype 1)
        const url = `https://${sanitizedUrl}/api/data/v9.2/savedqueries?$select=name,returnedtypecode,querytype,ismanaged,isdefault&$filter=ismanaged eq false and (querytype eq 0 or querytype eq 2 or querytype eq 4)&$orderby=returnedtypecode,name asc`;

        console.log(`[listSystemViews] Fetching from: ${url}`);

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
                Prefer: 'odata.maxpagesize=5000'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[listSystemViews] Error ${response.status}: ${errorText}`);
            throw new Error(`Failed to fetch system views: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        const mapped = data.value.map((view: any) => ({
            viewId: view.savedqueryid,
            name: view.name,
            entityLogicalName: view.returnedtypecode,
            queryType: view.querytype,
            isManaged: view.ismanaged ?? false,
            isDefault: view.isdefault ?? false,
        }));

        console.log(`[listSystemViews] Found ${mapped.length} custom views`);

        const BATCH_SIZE = 100;
        for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
            const batch = mapped.slice(i, i + BATCH_SIZE);
            await ctx.runMutation(api.mutations.upsertSystemViews, {
                tenantId: args.tenantId,
                views: batch
            });
        }

        return mapped;
    },
});

export const syncAllApps = action({
    args: { tenantId: v.string(), orgId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        console.log(`[syncAllApps] Syncing all app landscape data for tenant: ${args.tenantId}`);

        const [apps, forms, views] = await Promise.all([
            ctx.runAction(api.actions.apps.listModelDrivenApps, { tenantId: args.tenantId, orgId: args.orgId }),
            ctx.runAction(api.actions.apps.listSystemForms, { tenantId: args.tenantId, orgId: args.orgId }),
            ctx.runAction(api.actions.apps.listSystemViews, { tenantId: args.tenantId, orgId: args.orgId }),
        ]);

        return {
            modelDrivenApps: apps.length,
            systemForms: forms.length,
            systemViews: views.length,
        };
    },
});
