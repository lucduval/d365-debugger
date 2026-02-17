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

export const listBusinessUnits = action({
    args: { tenantId: v.string(), orgId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const tenants = await ctx.runQuery(api.queries.getTenants, { orgId: args.orgId });
        const { tenant, sanitizedUrl } = resolveTenant(tenants, args.tenantId);
        const token = await getAccessToken(sanitizedUrl, tenant.clientId, tenant.clientSecret, tenant.tenantDirectoryId);

        const url = `https://${sanitizedUrl}/api/data/v9.2/businessunits?$select=name,businessunitid,_parentbusinessunitid_value,isdisabled&$orderby=name asc`;

        console.log(`[listBusinessUnits] Fetching from: ${url}`);

        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[listBusinessUnits] Error ${response.status}: ${errorText}`);
            throw new Error(`Failed to fetch business units: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        const mapped = data.value.map((bu: any) => ({
            businessUnitId: bu.businessunitid,
            name: bu.name,
            parentBusinessUnitId: bu._parentbusinessunitid_value || undefined,
            isDisabled: bu.isdisabled,
        }));

        await ctx.runMutation(api.mutations.upsertBusinessUnits, {
            tenantId: args.tenantId,
            businessUnits: mapped
        });

        return mapped;
    },
});

export const listSecurityRoles = action({
    args: { tenantId: v.string(), orgId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const tenants = await ctx.runQuery(api.queries.getTenants, { orgId: args.orgId });
        const { tenant, sanitizedUrl } = resolveTenant(tenants, args.tenantId);
        const token = await getAccessToken(sanitizedUrl, tenant.clientId, tenant.clientSecret, tenant.tenantDirectoryId);

        const url = `https://${sanitizedUrl}/api/data/v9.2/roles?$select=name,roleid,_businessunitid_value,ismanaged,iscustomizable&$filter=ismanaged eq false&$orderby=name asc`;

        console.log(`[listSecurityRoles] Fetching from: ${url}`);

        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[listSecurityRoles] Error ${response.status}: ${errorText}`);
            throw new Error(`Failed to fetch security roles: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        const mapped = data.value.map((role: any) => ({
            roleId: role.roleid,
            name: role.name,
            businessUnitId: role._businessunitid_value || undefined,
            isManaged: role.ismanaged ?? false,
            isCustomizable: role.iscustomizable?.Value ?? true,
        }));

        await ctx.runMutation(api.mutations.upsertSecurityRoles, {
            tenantId: args.tenantId,
            roles: mapped
        });

        return mapped;
    },
});

export const listSecurityTeams = action({
    args: { tenantId: v.string(), orgId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const tenants = await ctx.runQuery(api.queries.getTenants, { orgId: args.orgId });
        const { tenant, sanitizedUrl } = resolveTenant(tenants, args.tenantId);
        const token = await getAccessToken(sanitizedUrl, tenant.clientId, tenant.clientSecret, tenant.tenantDirectoryId);

        // Fetch teams with their associated roles expanded
        const url = `https://${sanitizedUrl}/api/data/v9.2/teams?$select=name,teamid,teamtype,_businessunitid_value,isdefault&$expand=teamroles_association($select=name,roleid)&$orderby=name asc`;

        console.log(`[listSecurityTeams] Fetching from: ${url}`);

        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[listSecurityTeams] Error ${response.status}: ${errorText}`);
            throw new Error(`Failed to fetch security teams: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        const mapped = data.value.map((team: any) => ({
            teamId: team.teamid,
            name: team.name,
            teamType: team.teamtype,
            businessUnitId: team._businessunitid_value || undefined,
            isDefault: team.isdefault ?? false,
            roles: (team.teamroles_association || []).map((r: any) => ({
                roleId: r.roleid,
                name: r.name
            })),
        }));

        await ctx.runMutation(api.mutations.upsertSecurityTeams, {
            tenantId: args.tenantId,
            teams: mapped
        });

        return mapped;
    },
});

export const syncAllSecurity = action({
    args: { tenantId: v.string(), orgId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        console.log(`[syncAllSecurity] Syncing all security data for tenant: ${args.tenantId}`);

        const [bus, roles, teams] = await Promise.all([
            ctx.runAction(api.actions.security.listBusinessUnits, { tenantId: args.tenantId, orgId: args.orgId }),
            ctx.runAction(api.actions.security.listSecurityRoles, { tenantId: args.tenantId, orgId: args.orgId }),
            ctx.runAction(api.actions.security.listSecurityTeams, { tenantId: args.tenantId, orgId: args.orgId }),
        ]);

        return {
            businessUnits: bus.length,
            securityRoles: roles.length,
            securityTeams: teams.length,
        };
    },
});
