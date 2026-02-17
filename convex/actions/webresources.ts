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

const WEB_RESOURCE_TYPE_LABELS: Record<number, string> = {
    1: "HTML", 2: "CSS", 3: "JScript", 4: "XML", 5: "PNG",
    6: "JPG", 7: "GIF", 8: "XAP", 9: "XSL", 10: "ICO", 11: "SVG", 12: "RESX"
};

export const listWebResources = action({
    args: { tenantId: v.string(), orgId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const tenants = await ctx.runQuery(api.queries.getTenants, { orgId: args.orgId });
        const { tenant, sanitizedUrl } = resolveTenant(tenants, args.tenantId);
        const token = await getAccessToken(sanitizedUrl, tenant.clientId, tenant.clientSecret, tenant.tenantDirectoryId);

        // Fetch only custom (unmanaged) web resources to avoid pulling thousands of system resources
        const url = `https://${sanitizedUrl}/api/data/v9.2/webresourceset?$select=name,displayname,webresourcetype,description,ismanaged,modifiedon&$filter=ismanaged eq false&$orderby=name asc`;

        console.log(`[listWebResources] Fetching from: ${url}`);

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
                Prefer: 'odata.maxpagesize=5000'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[listWebResources] Error ${response.status}: ${errorText}`);
            throw new Error(`Failed to fetch web resources: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        const mapped = data.value.map((wr: any) => ({
            webResourceId: wr.webresourceid,
            name: wr.name,
            displayName: wr.displayname || undefined,
            webResourceType: wr.webresourcetype,
            description: wr.description || undefined,
            isManaged: wr.ismanaged ?? false,
            modifiedOn: wr.modifiedon || undefined,
        }));

        console.log(`[listWebResources] Found ${mapped.length} custom web resources`);

        // Batch upserts in chunks to avoid Convex's 4096 read limit per mutation
        const BATCH_SIZE = 100;
        for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
            const batch = mapped.slice(i, i + BATCH_SIZE);
            await ctx.runMutation(api.mutations.upsertWebResources, {
                tenantId: args.tenantId,
                webResources: batch
            });
            console.log(`[listWebResources] Upserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(mapped.length / BATCH_SIZE)}`);
        }

        return mapped;
    },
});

export const getWebResourceContent = action({
    args: { tenantId: v.string(), webResourceId: v.string(), orgId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const tenants = await ctx.runQuery(api.queries.getTenants, { orgId: args.orgId });
        const { tenant, sanitizedUrl } = resolveTenant(tenants, args.tenantId);
        const token = await getAccessToken(sanitizedUrl, tenant.clientId, tenant.clientSecret, tenant.tenantDirectoryId);

        const url = `https://${sanitizedUrl}/api/data/v9.2/webresourceset(${args.webResourceId})?$select=content,name,webresourcetype`;

        console.log(`[getWebResourceContent] Fetching from: ${url}`);

        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[getWebResourceContent] Error ${response.status}: ${errorText}`);
            throw new Error(`Failed to fetch web resource content: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const base64Content = data.content || "";
        const webResourceType = data.webresourcetype;

        // Decode base64 for text-based resources (HTML, CSS, JS, XML, XSL, RESX, SVG)
        const textTypes = [1, 2, 3, 4, 9, 11, 12];
        let decodedContent = "";

        if (textTypes.includes(webResourceType) && base64Content) {
            try {
                decodedContent = Buffer.from(base64Content, "base64").toString("utf-8");
            } catch (e) {
                console.error("[getWebResourceContent] Failed to decode base64:", e);
                decodedContent = "// Failed to decode content";
            }
        }

        return {
            name: data.name,
            webResourceType,
            typeLabel: WEB_RESOURCE_TYPE_LABELS[webResourceType] || `Type ${webResourceType}`,
            base64Content,
            decodedContent,
            sizeBytes: base64Content ? Math.floor(base64Content.length * 0.75) : 0,
            isTextBased: textTypes.includes(webResourceType),
        };
    },
});
