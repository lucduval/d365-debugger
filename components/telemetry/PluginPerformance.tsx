import React from 'react';
import { Cpu, Zap, AlertTriangle } from 'lucide-react';

interface PluginMetric {
    pluginName: string;
    avgDuration: number;
    maxDuration: number;
    execCount: number;
}

interface PluginPerformanceProps {
    data: PluginMetric[];
    loading: boolean;
}

function formatDuration(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}

function getSeverity(avgMs: number): { label: string; color: string; bg: string } {
    if (avgMs > 5000) return { label: 'Critical', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' };
    if (avgMs > 2000) return { label: 'Slow', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' };
    if (avgMs > 500) return { label: 'Moderate', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' };
    return { label: 'Fast', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' };
}

export default function PluginPerformance({ data, loading }: PluginPerformanceProps) {
    if (loading) {
        return (
            <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
                        <div className="h-4 bg-slate-200 rounded w-2/3 mb-3" />
                        <div className="flex gap-6">
                            <div className="h-3 bg-slate-100 rounded w-24" />
                            <div className="h-3 bg-slate-100 rounded w-24" />
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
                <Cpu size={40} className="mx-auto text-slate-300 mb-3" />
                <h3 className="font-semibold text-slate-600 mb-1">No Plugin Data</h3>
                <p className="text-sm text-slate-400">
                    Sync telemetry data to see plugin execution performance.<br />
                    Plugins must emit custom events to Application Insights.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {/* Header Row */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <div className="col-span-5">Plugin Name</div>
                <div className="col-span-2 text-right">Avg Duration</div>
                <div className="col-span-2 text-right">Max Duration</div>
                <div className="col-span-1 text-right">Runs</div>
                <div className="col-span-2 text-right">Status</div>
            </div>

            {data.map((plugin, i) => {
                const severity = getSeverity(plugin.avgDuration);

                return (
                    <div
                        key={i}
                        className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all"
                    >
                        <div className="grid grid-cols-12 gap-4 items-center px-4 py-3">
                            {/* Plugin Name */}
                            <div className="col-span-5 flex items-center gap-2 min-w-0">
                                {plugin.avgDuration > 2000 && (
                                    <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                                )}
                                <span className="text-sm font-medium text-slate-700 truncate font-mono">
                                    {plugin.pluginName}
                                </span>
                            </div>

                            {/* Avg Duration */}
                            <div className="col-span-2 text-right">
                                <span className={`text-sm font-bold ${severity.color}`}>
                                    {formatDuration(plugin.avgDuration)}
                                </span>
                            </div>

                            {/* Max Duration */}
                            <div className="col-span-2 text-right">
                                <span className="text-sm text-slate-500">
                                    {formatDuration(plugin.maxDuration)}
                                </span>
                            </div>

                            {/* Exec Count */}
                            <div className="col-span-1 text-right">
                                <span className="text-sm text-slate-500">
                                    {plugin.execCount.toLocaleString()}
                                </span>
                            </div>

                            {/* Severity Badge */}
                            <div className="col-span-2 text-right">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${severity.bg} ${severity.color}`}>
                                    {severity.label}
                                </span>
                            </div>
                        </div>

                        {/* Performance bar */}
                        <div className="px-4 pb-3">
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${plugin.avgDuration > 5000 ? 'bg-rose-500' : plugin.avgDuration > 2000 ? 'bg-amber-500' : plugin.avgDuration > 500 ? 'bg-blue-500' : 'bg-emerald-500'
                                        }`}
                                    style={{ width: `${Math.min(100, (plugin.avgDuration / 10000) * 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
