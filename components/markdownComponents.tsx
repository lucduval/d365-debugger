import React from 'react';

// Recursively extract plain text from React children
function extractText(node: any): string {
    if (typeof node === 'string') return node;
    if (typeof node === 'number') return String(node);
    if (!node) return '';
    if (Array.isArray(node)) return node.map(extractText).join('');
    if (node.props?.children) return extractText(node.props.children);
    return '';
}

// Strip [!TYPE] tags from React children for clean display
function stripCalloutTag(children: any): { cleaned: any; title: string } {
    const tagPattern = /\[!(WARNING|INFO|SUCCESS|ERROR|NOTE)\]\s*/;

    function processNode(node: any): any {
        if (typeof node === 'string') return node.replace(tagPattern, '');
        if (Array.isArray(node)) return node.map(processNode);
        if (node?.props?.children) {
            return React.cloneElement(node, {}, processNode(node.props.children));
        }
        return node;
    }

    const text = extractText(children);
    const match = text.match(tagPattern);
    const title = match ? match[1] : '';
    return { cleaned: processNode(children), title };
}

const CALLOUT_STYLES: Record<string, { bg: string; icon: string; label: string }> = {
    ERROR:   { bg: 'bg-rose-50 border-rose-400',      icon: '🚨', label: 'Error' },
    WARNING: { bg: 'bg-amber-50 border-amber-400',     icon: '⚠️', label: 'Warning' },
    SUCCESS: { bg: 'bg-emerald-50 border-emerald-400',  icon: '✅', label: 'Success' },
    INFO:    { bg: 'bg-sky-50 border-sky-400',          icon: 'ℹ️', label: 'Info' },
    NOTE:    { bg: 'bg-violet-50 border-violet-400',    icon: '📝', label: 'Note' },
};

export const markdownComponents = {
    table: ({ children, ...props }: any) => (
        <div className="my-4 overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
            <table className="w-full border-collapse text-sm" {...props}>{children}</table>
        </div>
    ),
    thead: ({ children, ...props }: any) => (
        <thead className="bg-slate-800 text-white" {...props}>{children}</thead>
    ),
    th: ({ children, ...props }: any) => (
        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider border-b border-slate-600" {...props}>{children}</th>
    ),
    tbody: ({ children, ...props }: any) => (
        <tbody className="divide-y divide-slate-100" {...props}>{children}</tbody>
    ),
    tr: ({ children, ...props }: any) => (
        <tr className="even:bg-slate-50/80 hover:bg-indigo-50/50 transition-colors" {...props}>{children}</tr>
    ),
    td: ({ children, ...props }: any) => (
        <td className="px-4 py-2.5 text-slate-700 border-b border-slate-100" {...props}>{children}</td>
    ),
    blockquote: ({ children, ...props }: any) => {
        const { cleaned, title } = stripCalloutTag(children);
        const style = CALLOUT_STYLES[title] || null;

        if (!style) {
            return <blockquote className="my-3 p-4 rounded-lg border-l-4 bg-slate-50 border-slate-300 text-slate-700 not-italic" {...props}>{children}</blockquote>;
        }

        return (
            <div className={`my-3 rounded-lg border-l-4 ${style.bg} not-italic overflow-hidden`}>
                <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                    <span className="text-sm">{style.icon}</span>
                    <span className="text-xs font-bold uppercase tracking-wider opacity-70">{style.label}</span>
                </div>
                <div className="px-4 pb-3 text-sm [&>p]:m-0">{cleaned}</div>
            </div>
        );
    },
};
