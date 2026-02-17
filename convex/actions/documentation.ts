"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
// Use require to avoid circular type dependency with api.ts
const { api } = require("../_generated/api") as any;



import { markdownToStorage } from "../lib/markdownToStorage";

// --- Actions (Gemini & Confluence) ---

export const generateDocumentation = action({
    args: { flowId: v.id("flows"), tenantId: v.string() },
    handler: async (ctx, args) => {
        // 1. Fetch Flow Data (Internal)
        const flow = await ctx.runQuery(api.queries.getFlowById, { flowId: args.flowId });
        if (!flow) throw new Error("Flow not found");

        let clientData = flow.clientData ? JSON.parse(flow.clientData) : null;

        // If clientData is missing locally, we might need to fetch it (logic similar to gemini.ts analyzeFlow)
        // For now, assuming clientData is present or we rely on the analyzeFlow to have populated it.
        // If strict fetching is needed, we can copy the logic from gemini.ts
        if (!clientData) {
            throw new Error("Flow definition not found. Please run 'Audit Logic' first to fetch latest definition.");
        }

        const prompt: string = `
You are an expert Business Analyst documenting Power Automate flows for non-technical stakeholders.
Your goal is to explain WHAT the process does and WHY, avoiding technical jargon like "initialize variable", "compose", or JSON paths.

**CRITICAL: Output ONLY valid Markdown. Do NOT start with "Here is the documentation" or "Sure". Start directly with the Metadata Table.**

Flow Name: ${flow.name}
Flow Definition (JSON):
${JSON.stringify(clientData, null, 2)}

Instructions:
1.  **Metadata Table**: Start with a Markdown table containing the following columns:
    *   **Automation Name**: ${flow.name}
    *   **Link to Automation in Dev**: [Automation Link](https://make.powerautomate.com/) (Placeholder, or use actual link if known)
    *   **State**: **ACTIVE** (or relevant status)
    *   **Description**: A 1-sentence summary of what it does.
    *   **Trigger**: What triggers this flow.

2.  **High-level Diagram**:
    *   Generate a high-level flowchart using **Mermaid.js** syntax.
    *   Wrap it in a markdown code block with the language identifier \`mermaid\`.
    *   Keep it simple and focused on business logic.

3.  **Concise Pseudocode Logic with Embedded Notes**:
    *   Write a **numbered list** of the flow's logic.
    *   **CRITICAL: INTEGRATE** important notes, warnings, and business rules directly into this list, immediately following the relevant step. Do NOT create a separate "Important Notes" section at the end.
    *   Use a **pseudocode style**.
    *   Use the following Callout syntax for these embedded notes (place them nested under the relevant list item):
        *   \`> [!INFO] Title\` for general information.
        *   \`> [!NOTE] Title\` for neutral notes.
        *   \`> [!WARNING] Title\` for warnings or critical business rules.
        *   \`> [!SUCCESS] Title\` for good things.
        *   \`> [!ERROR] Title\` for bad things.
    *   Be extremely **concise**. Avoid long paragraphs.
    *   Use bolding for key decisions.

4.  **APIs / External Services**: List any APIs or connectors used.

Output Format: Markdown.
`;

        // 2. Call Gemini
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

        // Dynamically find a valid model
        const modelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const modelsResponse = await fetch(modelsUrl);

        if (!modelsResponse.ok) {
            const errorText = await modelsResponse.text();
            throw new Error(`Failed to list Gemini models: ${modelsResponse.status} ${errorText}`);
        }

        const modelsData = await modelsResponse.json();
        const availableModels = modelsData.models || [];

        // Filter for models that support generateContent
        const contentModels = availableModels.filter((m: any) =>
            m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")
        );

        if (contentModels.length === 0) {
            throw new Error("No Gemini models found that support generateContent.");
        }

        // Prioritize models: Flash > Pro > Preview > Others
        const sortedModels = contentModels.sort((a: any, b: any) => {
            const getScore = (name: string) => {
                if (name.includes("gemini-1.5-flash")) return 10;
                if (name.includes("gemini-1.5-pro")) return 8;
                if (name.includes("gemini-pro")) return 5;
                if (name.includes("flash")) return 3;
                return 1;
            };
            return getScore(b.name) - getScore(a.name);
        });

        console.log(`[generateDocumentation] Available models: ${sortedModels.map((m: any) => m.name).join(", ")}`);

        let generatedText: string | undefined;
        let lastError = null;

        // Try models in order
        for (const model of sortedModels) {
            const modelName = model.name.replace("models/", "");
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

            try {
                const response = await fetch(geminiUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                });

                if (response.ok) {
                    const data: any = await response.json();
                    generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (generatedText) {
                        console.log(`[generateDocumentation] Success with model: ${modelName}`);
                        break;
                    }
                } else {
                    const errorText = await response.text();
                    console.warn(`[generateDocumentation] Model ${modelName} failed: ${response.status} ${errorText}`);
                    lastError = new Error(`Model ${modelName} error: ${response.status} ${errorText}`);
                }
            } catch (e) {
                console.warn(`[generateDocumentation] Network error with model ${modelName}:`, e);
                lastError = e instanceof Error ? e : new Error(String(e));
            }
        }

        if (!generatedText) throw lastError || new Error("All Gemini models failed to generate content or returned empty.");

        return generatedText;
    },
});

export const publishToConfluence = action({
    args: {
        flowId: v.id("flows"),
        title: v.string(),
        content: v.string() // Markdown
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const settings = await ctx.runQuery(api.queries.getConfluenceSettingsByUserId, { userId: identity.tokenIdentifier });

        if (!settings || !settings.spaceKey) {
            throw new Error("Confluence settings incomplete. Please configure Domain, Email, Token, and Space Key.");
        }

        const { domain, email, apiToken, spaceKey, parentId } = settings;
        const sanitizedDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
        const authHeader = `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`;
        const baseUrl = `https://${sanitizedDomain}/wiki/api/v2`;

        // 1. Get Space ID from Space Key
        const spaceRes = await fetch(`${baseUrl}/spaces?keys=${spaceKey}`, {
            headers: { 'Authorization': authHeader, 'Accept': 'application/json' }
        });

        if (!spaceRes.ok) {
            throw new Error(`Failed to fetch Space ID for key '${spaceKey}': ${spaceRes.status}`);
        }
        const spaceData = await spaceRes.json();
        if (spaceData.results.length === 0) {
            throw new Error(`Space with key '${spaceKey}' not found.`);
        }
        const spaceId = spaceData.results[0].id;

        // 2. Convert Markdown to Confluence Storage Format
        const storageBody = markdownToStorage(args.content);

        // Add Title Header
        const fullBody = `
            <p><strong>Flow Documentation: ${args.title}</strong></p>
            <hr/>
            ${storageBody}
            <p><em>Published via D365 Debugger</em></p>
        `;

        // 3. Check if page already exists for this flow (via our DB)
        // using api.documentation.getDocumentation
        const doc = await ctx.runQuery(api.documentation.getDocumentation, { flowId: args.flowId });
        const existingPageId = doc?.confluencePageId;

        let pageId = existingPageId;
        let finalUrl = "";

        if (existingPageId) {
            // Update Flow
            // We need current version number to update
            const pageRes = await fetch(`${baseUrl}/pages/${existingPageId}`, {
                headers: { 'Authorization': authHeader, 'Accept': 'application/json' }
            });

            if (pageRes.ok) {
                const pageData = await pageRes.json();
                const newVersion = pageData.version.number + 1;

                const response = await fetch(`${baseUrl}/pages/${existingPageId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': authHeader,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        id: existingPageId,
                        status: 'current',
                        title: args.title,
                        body: {
                            representation: 'storage',
                            value: fullBody
                        },
                        version: {
                            number: newVersion,
                            message: "Flow updated via D365 Debugger"
                        }
                    })
                });

                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(`Failed to update page: ${response.status} ${errText}`);
                }

                const resultData = await response.json();
                finalUrl = `https://${sanitizedDomain}/wiki${resultData._links.webui}`;

            } else {
                throw new Error(`Failed to fetch existing page ${existingPageId}. It might have been deleted.`);
            }
        } else {
            // Create New Page
            const createBody: any = {
                spaceId: spaceId,
                status: 'current',
                title: args.title,
                body: {
                    representation: 'storage',
                    value: fullBody
                }
            };

            // Add parentId if configured
            if (parentId) {
                createBody.parentId = parentId;
            }

            const response = await fetch(`${baseUrl}/pages`, {
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(createBody)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Confluence API Error: ${response.status} ${errText}`);
            }

            const resultData = await response.json();
            pageId = resultData.id;
            finalUrl = `https://${sanitizedDomain}/wiki${resultData._links.webui}`;
        }

        // 4. Update DB
        if (pageId) {
            // using api.documentation.saveDocumentation
            await ctx.runMutation(api.documentation.saveDocumentation, {
                flowId: args.flowId,
                content: args.content,
                status: 'published',
                confluencePageId: pageId,
                confluenceUrl: finalUrl
            });
        }

        return { success: true, url: finalUrl };
    }
});
