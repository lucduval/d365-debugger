import React from 'react';
import { Clock, TrendingDown, AlertTriangle } from 'lucide-react';

interface SlowPage {
    name: string;
    avgDuration: number;
    p95Duration: number;
    requestCount: number;
}

interface SlowPagesProps {
    data: SlowPage[];
    loading: boolean;
}

function formatDuration(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}

function getSeverityColor(avgMs: number): string {
    if (avgMs > 5000) return 'text-rose-600 bg-rose-50';
    if (avgMs > 3000) return 'text-amber-600 bg-amber-50';
    return 'text-emerald-600 bg-emerald-50';
}

function getSeverityLabel(avgMs: number): string {
    if (avgMs > 5000) return 'Critical';
    if (avgMs > 3000) return 'Slow';
    return 'Acceptable';
}

export default function SlowPages({ data, loading }: SlowPagesProps) {
    if (loading) {
        return (
            <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
                        <div className="h-4 bg-slate-200 rounded w-2/3 mb-3" />
                        <div className="flex gap-4">
                            <div className="h-3 bg-slate-100 rounded w-20" />
                            <div className="h-3 bg-slate-100 rounded w-20" />
                            <div className="h-3 bg-slate-100 rounded w-16" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <Clock size={40} className="mx-auto text-slate-300 mb-3" />
                <h3 className="font-semibold text-slate-600 mb-1">No Page Load Data</h3>
                <p className="text-sm text-slate-400">
                    Sync telemetry data to see page load performance metrics.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <div className="col-span-5">Page / Form</div>
                <div className="col-span-2 text-right">Avg Load</div>
                <div className="col-span-2 text-right">P95 Load</div>
                <div className="col-span-1 text-right">Views</div>
                <div className="col-span-2 text-right">Status</div>
            </div>

            {data.map((page, i) => (
                <div
                    key={i}
                    className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all group"
                >
                    <div className="grid grid-cols-12 gap-4 items-center px-4 py-3">
                        {/* Name */}
                        <div className="col-span-5 flex items-center gap-2 min-w-0">
                            {page.avgDuration > 5000 && (
                                <AlertTriangle size={14} className="text-rose-500 shrink-0" />
                            )}
                            <span className="text-sm font-medium text-slate-700 truncate">
                                {page.name || 'Unknown Page'}
                            </span>
                        </div>

                        {/* Avg Duration */}
                        <div className="col-span-2 text-right">
                            <span className={`text-sm font-bold ${page.avgDuration > 3000 ? 'text-rose-600' : page.avgDuration > 1500 ? 'text-amber-600' : 'text-slate-700'}`}>
                                {formatDuration(page.avgDuration)}
                            </span>
                        </div>

                        {/* P95 Duration */}
                        <div className="col-span-2 text-right">
                            <span className="text-sm text-slate-500">
                                {formatDuration(page.p95Duration)}
                            </span>
                        </div>

                        {/* Request Count */}
                        <div className="col-span-1 text-right">
                            <span className="text-sm text-slate-500">
                                {page.requestCount.toLocaleString()}
                            </span>
                        </div>

                        {/* Severity Badge */}
                        <div className="col-span-2 text-right">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${getSeverityColor(page.avgDuration)}`}>
                                {getSeverityLabel(page.avgDuration)}
                            </span>
                        </div>
                    </div>

                    {/* Performance bar */}
                    <div className="px-4 pb-3">
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${page.avgDuration > 5000 ? 'bg-rose-500' : page.avgDuration > 3000 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(100, (page.avgDuration / 10000) * 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
