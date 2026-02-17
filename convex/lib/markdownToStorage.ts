export function markdownToStorage(markdown: string): string {
    let html = markdown;

    // 1. Escape HTML special characters (basic)
    html = html
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // 2. Code Blocks (PRE) - including Mermaid
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    html = html.replace(codeBlockRegex, (match, lang, content) => {
        const language = lang || "text";
        return `<ac:structured-macro ac:name="code" ac:schema-version="1">
<ac:parameter ac:name="language">${language}</ac:parameter>
<ac:plain-text-body><![CDATA[${content.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')}]]></ac:plain-text-body>
</ac:structured-macro>`;
    });

    // 3. Process Line-by-Line for Tables, Lists, Headers, and Callouts
    // Note: We skip the first "simple" loop attempt and go straight to the robust state machine.

    const lines = html.split('\n');
    let output = "";
    let inTable = false;
    let inList = false;

    // RESTARTING loop logic with correct state machine
    // We need to preserve the `lines` split.
    // Callout handling inside loop:

    // Reset output to empty to rebuild it properly
    output = "";

    let inCallout = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Check for Code Block Macro lines we generated (skip processing them)
        if (line.includes("<ac:structured-macro") ||
            line.includes("</ac:structured-macro>") ||
            line.includes("<ac:parameter") ||
            (line.includes("ac:plain-text-body") && !line.startsWith("&gt;"))) {
            output += line + "\n";
            continue;
        }

        // BLOCKQUOTES / CALLOUTS
        // Check for start of callout
        const calloutStart = line.match(/^\s*&gt;\s*\[!(INFO|NOTE|WARNING|SUCCESS|ERROR)\]\s*(.*)/i);
        if (calloutStart) {
            if (inCallout) {
                // Close previous callout if nested (unlikely) or adjacent?
                output += "</p></ac:rich-text-body></ac:structured-macro>\n";
            }
            inCallout = true;
            const type = calloutStart[1].toUpperCase();
            const title = calloutStart[2].trim();

            let macroName = "info";
            if (type === "NOTE") macroName = "note";
            if (type === "WARNING") macroName = "warning";
            if (type === "SUCCESS") macroName = "tip";
            if (type === "ERROR") macroName = "warning";

            output += `<ac:structured-macro ac:name="${macroName}" ac:schema-version="1">`;
            if (title) {
                output += `<ac:parameter ac:name="title">${title}</ac:parameter>`;
            }
            output += `<ac:rich-text-body><p>`;
            continue;
        }

        // Check if we are inside a callout (continuation lines starting with >)
        // Note: markdownToStorage input is HTML escaped, so > is &gt;
        if (inCallout) {
            if (line.trim().startsWith("&gt;")) {
                const content = line.replace(/^\s*&gt;\s?/, "");
                output += parseInline(content) + " "; // append content
                continue;
            } else if (line.trim() === "") {
                // Empty line might mean end of blockquote or just paragraph break
                // Standard markdown: blockquote needs > on every line OR text without > but adjacent.
                // But usually prompts generate > on every line.
                // If empty line, we assume end of callout?
                inCallout = false;
                output += "</p></ac:rich-text-body></ac:structured-macro>\n";
            } else {
                // Text without >, end of callout
                inCallout = false;
                output += "</p></ac:rich-text-body></ac:structured-macro>\n";
                // Fall through to process this line normally
            }
        }

        // HEADERS
        if (line.startsWith("#")) {
            const level = line.match(/^#+/)?.[0].length || 0;
            if (level > 0 && level <= 6) {
                const content = line.substring(level).trim();
                output += `<h${level}>${parseInline(content)}</h${level}>\n`;
                continue;
            }
        }

        // LISTS
        if (line.match(/^(\s*)-\s/)) {
            if (!inList) {
                output += "<ul>\n";
                inList = true;
            }
            const content = line.replace(/^(\s*)-\s/, '').trim();
            output += `<li>${parseInline(content)}</li>\n`;
            continue;
        } else if (inList) {
            output += "</ul>\n";
            inList = false;
        }

        // TABLES
        if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
            if (!inTable) {
                // Header check
                if (i + 1 < lines.length && lines[i + 1].trim().match(/^\|[\s-:]+\|/)) {
                    inTable = true;
                    output += "<table><tbody>\n";

                    const headers = line.split('|').map(c => c.trim()).filter(c => c);
                    output += "<tr>";
                    headers.forEach(h => {
                        // Added Color Style to Headers
                        output += `<th style="background-color: #f4f5f7;">${parseInline(h)}</th>`;
                    });
                    output += "</tr>\n";

                    i++; // Skip separator
                    continue;
                }
            } else {
                // Row
                const cells = line.split('|').slice(1, -1).map(c => c.trim());
                output += "<tr>";
                cells.forEach(c => {
                    output += `<td>${parseInline(c)}</td>`;
                });
                output += "</tr>\n";
                continue;
            }
        } else if (inTable) {
            output += "</tbody></table>\n";
            inTable = false;
        }

        // PARAGRAPHS
        if (line.trim() === "") {
            continue;
        }

        output += `<p>${parseInline(line)}</p>\n`;
    }

    if (inList) output += "</ul>\n";
    if (inTable) output += "</tbody></table>\n";
    if (inCallout) output += "</p></ac:rich-text-body></ac:structured-macro>\n";

    return output;
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function parseInline(text: string): string {
    // Bold
    text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    // Italic
    text = text.replace(/\*(.*?)\*/g, "<em>$1</em>");
    // Links [text](url)
    text = text.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
    return text;
}
