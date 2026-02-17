import React, { useState, useCallback } from 'react';
import {
    BarChart3, RefreshCw, Clock, Bug, Cpu, Users, Globe,
    AlertTriangle, TrendingUp, Loader2, Settings, Zap, Eye
} from 'lucide-react';
import { useQuery, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import SlowPages from './SlowPages';
import ErrorLog from './ErrorLog';
import PluginPerformance from './PluginPerformance';

type TelemetrySubTab = 'overview' | 'slow_pages' | 'js_errors' | 'plugin_performance';

interface TelemetryDashboardProps {
    activeTenant: any;
    orgId?: string;
    onOpenSettings?: () => void;
}

function formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
}

function formatDuration(ms: number): string {
    if (!ms || ms === 0) return '0ms';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}

export default function TelemetryDashboard({ activeTenant, orgId, onOpenSettings }: TelemetryDashboardProps) {
    const [activeSubTab, setActiveSubTab] = useState<TelemetrySubTab>('overview');
    const [syncing, setSyncing] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);
    const [timeRange, setTimeRange] = useState('P7D');

    const tenantId = activeTenant?.tenantId;

    // Check if App Insights is connected
    const connection = useQuery(
        api.queries.getAppInsightsConnection,
        tenantId ? { tenantId } : "skip"
    );

    // Get cached telemetry data
    const allSnapshots = useQuery(
        api.queries.getAllTelemetrySnapshots,
        tenantId ? { tenantId } : "skip"
    ) || [];

    const getSnapshotData = useCallback((queryType: string) => {
        const snapshot = allSnapshots.find((s: any) => s.queryType === queryType);
        if (!snapshot) return null;
        try {
            return JSON.parse(snapshot.result);
        } catch {
            return null;
        }
    }, [allSnapshots]);

    const getSnapshotTimestamp = useCallback((queryType: string) => {
        const snapshot = allSnapshots.find((s: any) => s.queryType === queryType);
        return snapshot?.timestamp;
    }, [allSnapshots]);

    const overview = getSnapshotData('overview');
    const slowPagesData = getSnapshotData('slow_pages') || [];
    const jsErrorsData = getSnapshotData('js_errors') || [];
    const pluginPerfData = getSnapshotData('plugin_performance') || [];
    const lastSyncedAt = getSnapshotTimestamp('overview');

    // Actions
    const syncAllTelemetry = useAction(api.actions.telemetry.syncAllTelemetry);

    const handleSync = async () => {
        if (!tenantId) return;
        setSyncing(true);
        setSyncError(null);
        try {
            await syncAllTelemetry({ tenantId, orgId, timespan: timeRange });
        } catch (error: any) {
            console.error("Telemetry sync failed:", error);
            setSyncError(error.message || 'Sync failed');
        } finally {
            setSyncing(false);
        }
    };

    // Not connected state
    if (!connection) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center max-w-md">
                    <div className="bg-violet-100 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <BarChart3 size={36} className="text-violet-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">App Telemetry</h2>
                    <p className="text-slate-500 mb-6">
                        Connect Azure Application Insights to view real-time performance data,
                        error logs, and plugin execution metrics for this environment.
                    </p>
                    <button
                        onClick={onOpenSettings}
                        className="bg-violet-600 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-violet-700 transition-all shadow-lg shadow-violet-600/20 flex items-center gap-2 mx-auto"
                    >
                        <Settings size={18} />
                        Connect App Insights
                    </button>
                </div>
            </div>
        );
    }

    const subTabs: { id: TelemetrySubTab; label: string; icon: React.ReactNode; count?: number }[] = [
        { id: 'overview', label: 'Overview', icon: <Eye size={16} /> },
        { id: 'slow_pages', label: 'Slow Pages', icon: <Clock size={16} />, count: slowPagesData.length },
        { id: 'js_errors', label: 'Errors', icon: <Bug size={16} />, count: jsErrorsData.length },
        { id: 'plugin_performance', label: 'Plugins', icon: <Cpu size={16} />, count: pluginPerfData.length },
    ];

    return (
        <div className="flex-1 flex flex-col min-h-0">
            {/* Top Bar */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <BarChart3 size={28} className="text-violet-600" />
                        App Telemetry
                    </h2>
                    <p className="text-sm text-slate-400 mt-0.5 flex items-center gap-2">
                        {connection.displayName || 'Application Insights'}
                        {lastSyncedAt && (
                            <span className="text-slate-300">
                                &middot; Last synced {new Date(lastSyncedAt).toLocaleString()}
                            </span>
                        )}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Time Range Selector */}
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                    >
                        <option value="P1D">Last 24 hours</option>
                        <option value="P3D">Last 3 days</option>
                        <option value="P7D">Last 7 days</option>
                        <option value="P14D">Last 14 days</option>
                        <option value="P30D">Last 30 days</option>
                    </select>

                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="bg-violet-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-violet-700 transition-all flex items-center gap-2 text-sm disabled:opacity-50 shadow-lg shadow-violet-600/10"
                    >
                        {syncing ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <RefreshCw size={16} />
                        )}
                        {syncing ? 'Syncing...' : 'Sync Telemetry'}
                    </button>
                </div>
            </div>

            {/* Sync Error */}
            {syncError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 mb-4 text-sm flex items-center gap-2">
                    <AlertTriangle size={16} />
                    {syncError}
                </div>
            )}

            {/* Sub Tabs */}
            <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
                {subTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeSubTab === tab.id
                            ? 'bg-white text-violet-700 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                        {tab.count !== undefined && tab.count > 0 && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeSubTab === tab.id ? 'bg-violet-100 text-violet-600' : 'bg-slate-200 text-slate-500'
                                }`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {activeSubTab === 'overview' && (
                    <OverviewCards
                        overview={overview}
                        slowPagesCount={slowPagesData.length}
                        errorsCount={jsErrorsData.length}
                        pluginsCount={pluginPerfData.length}
                        loading={syncing}
                    />
                )}
                {activeSubTab === 'slow_pages' && (
                    <SlowPages data={slowPagesData} loading={syncing && slowPagesData.length === 0} />
                )}
                {activeSubTab === 'js_errors' && (
                    <ErrorLog data={jsErrorsData} loading={syncing && jsErrorsData.length === 0} />
                )}
                {activeSubTab === 'plugin_performance' && (
                    <PluginPerformance data={pluginPerfData} loading={syncing && pluginPerfData.length === 0} />
                )}
            </div>
        </div>
    );
}

// Overview Cards Sub-component
function OverviewCards({
    overview,
    slowPagesCount,
    errorsCount,
    pluginsCount,
    loading
}: {
    overview: any;
    slowPagesCount: number;
    errorsCount: number;
    pluginsCount: number;
    loading: boolean;
}) {
    if (!overview && !loading) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <TrendingUp size={40} className="mx-auto text-slate-300 mb-3" />
                <h3 className="font-semibold text-slate-600 mb-1">No Telemetry Data Yet</h3>
                <p className="text-sm text-slate-400">
                    Click &ldquo;Sync Telemetry&rdquo; to fetch the latest data from Application Insights.
                </p>
            </div>
        );
    }

    const cards = [
        {
            icon: <Clock size={20} />,
            iconBg: 'bg-blue-50',
            iconColor: 'text-blue-600',
            label: 'Avg Page Load',
            value: overview ? formatDuration(overview.avgPageLoad) : '—',
            sub: overview ? `P95: ${formatDuration(overview.p95PageLoad)}` : '',
        },
        {
            icon: <Bug size={20} />,
            iconBg: 'bg-rose-50',
            iconColor: 'text-rose-600',
            label: 'Total Errors',
            value: overview ? formatNumber(overview.totalErrors) : '—',
            sub: overview ? `${overview.uniqueErrors} unique` : '',
        },
        {
            icon: <Zap size={20} />,
            iconBg: 'bg-amber-50',
            iconColor: 'text-amber-600',
            label: 'Avg Request Time',
            value: overview ? formatDuration(overview.avgRequestDuration) : '—',
            sub: overview ? `${formatNumber(overview.failedRequests)} failed` : '',
        },
        {
            icon: <Globe size={20} />,
            iconBg: 'bg-violet-50',
            iconColor: 'text-violet-600',
            label: 'Total Requests',
            value: overview ? formatNumber(overview.totalRequests) : '—',
            sub: overview ? `${formatNumber(overview.totalPageViews)} page views` : '',
        },
        {
            icon: <Users size={20} />,
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-600',
            label: 'Unique Users',
            value: overview ? formatNumber(overview.uniqueUsers) : '—',
            sub: overview ? `${formatNumber(overview.totalSessions)} sessions` : '',
        },
    ];

    return (
        <div className="space-y-6">
            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {cards.map((card, i) => (
                    <div
                        key={i}
                        className={`bg-white rounded-2xl border border-slate-200 p-5 ${loading ? 'animate-pulse' : ''}`}
                    >
                        <div className={`${card.iconBg} w-10 h-10 rounded-xl flex items-center justify-center mb-3`}>
                            <span className={card.iconColor}>{card.icon}</span>
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            {card.label}
                        </div>
                        <div className="text-2xl font-bold text-slate-800">
                            {loading && !overview ? (
                                <div className="h-8 bg-slate-200 rounded w-20" />
                            ) : (
                                card.value
                            )}
                        </div>
                        {card.sub && (
                            <div className="text-xs text-slate-400 mt-1">{card.sub}</div>
                        )}
                    </div>
                ))}
            </div>

            {/* Quick Summary */}
            {(slowPagesCount > 0 || errorsCount > 0 || pluginsCount > 0) && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <h3 className="font-semibold text-slate-700 mb-4 text-sm flex items-center gap-2">
                        <AlertTriangle size={16} className="text-amber-500" />
                        Quick Summary
                    </h3>
                    <div className="space-y-3">
                        {slowPagesCount > 0 && (
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-2 h-2 rounded-full bg-amber-500" />
                                <span className="text-slate-600">
                                    <strong>{slowPagesCount}</strong> pages/forms have recorded load times
                                </span>
                            </div>
                        )}
                        {errorsCount > 0 && (
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-2 h-2 rounded-full bg-rose-500" />
                                <span className="text-slate-600">
                                    <strong>{errorsCount}</strong> unique errors detected in the past period
                                </span>
                            </div>
                        )}
                        {pluginsCount > 0 && (
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                <span className="text-slate-600">
                                    <strong>{pluginsCount}</strong> plugins tracked with performance data
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
