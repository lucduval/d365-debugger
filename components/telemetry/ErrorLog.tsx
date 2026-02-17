import React, { useState } from 'react';
import { Bug, ChevronDown, ChevronRight, AlertTriangle, Clock } from 'lucide-react';

interface JsError {
    type: string;
    outerMessage: string;
    problemId: string;
    errorCount: number;
    lastSeen: string;
    firstSeen: string;
}

interface ErrorLogProps {
    data: JsError[];
    loading: boolean;
}

function timeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
}

function getSeverityFromCount(count: number): { label: string; color: string } {
    if (count > 100) return { label: 'Critical', color: 'text-rose-600 bg-rose-50 border-rose-200' };
    if (count > 20) return { label: 'High', color: 'text-amber-600 bg-amber-50 border-amber-200' };
    if (count > 5) return { label: 'Medium', color: 'text-blue-600 bg-blue-50 border-blue-200' };
    return { label: 'Low', color: 'text-slate-500 bg-slate-50 border-slate-200' };
}

export default function ErrorLog({ data, loading }: ErrorLogProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    if (loading) {
        return (
            <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
                        <div className="h-4 bg-slate-200 rounded w-3/4 mb-3" />
                        <div className="h-3 bg-slate-100 rounded w-1/2" />
                    </div>
                ))}
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <Bug size={40} className="mx-auto text-slate-300 mb-3" />
                <h3 className="font-semibold text-slate-600 mb-1">No Errors Found</h3>
                <p className="text-sm text-slate-400">
                    Sync telemetry data to see JavaScript errors and exceptions.
                </p>
            </div>
        );
    }

    // Group errors by type
    const errorsByType = data.reduce((acc: Record<string, JsError[]>, err) => {
        const type = err.type || 'Unknown';
        if (!acc[type]) acc[type] = [];
        acc[type].push(err);
        return acc;
    }, {});

    return (
        <div className="space-y-2">
            {/* Summary bar */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <Bug size={16} className="text-rose-500" />
                    <span className="text-sm font-semibold text-slate-700">
                        {data.length} unique errors
                    </span>
                </div>
                <div className="text-sm text-slate-400">
                    {data.reduce((sum, e) => sum + e.errorCount, 0).toLocaleString()} total occurrences
                </div>
            </div>

            {/* Error list */}
            {data.map((error, i) => {
                const severity = getSeverityFromCount(error.errorCount);
                const isExpanded = expandedId === error.problemId;

                return (
                    <div
                        key={error.problemId || i}
                        className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all overflow-hidden"
                    >
                        <button
                            onClick={() => setExpandedId(isExpanded ? null : error.problemId)}
                            className="w-full text-left px-4 py-3 flex items-start gap-3"
                        >
                            <div className="mt-0.5 shrink-0 text-slate-400">
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${severity.color}`}>
                                        {severity.label}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                        {error.type || 'Exception'}
                                    </span>
                                </div>
                                <p className="text-sm font-medium text-slate-700 truncate">
                                    {error.outerMessage || 'No message available'}
                                </p>
                            </div>

                            <div className="text-right shrink-0">
                                <div className="text-sm font-bold text-slate-700">
                                    {error.errorCount.toLocaleString()}
                                </div>
                                <div className="text-[10px] text-slate-400">occurrences</div>
                            </div>
                        </button>

                        {/* Expanded details */}
                        {isExpanded && (
                            <div className="px-4 pb-4 pt-0 border-t border-slate-100 mx-4 mt-0">
                                <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">First Seen</span>
                                        <p className="text-slate-600 mt-0.5">
                                            {error.firstSeen ? new Date(error.firstSeen).toLocaleString() : 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Seen</span>
                                        <p className="text-slate-600 mt-0.5">
                                            {error.lastSeen ? timeAgo(error.lastSeen) : 'N/A'}
                                        </p>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Problem ID</span>
                                        <p className="text-slate-500 font-mono text-xs mt-0.5 break-all">
                                            {error.problemId || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
