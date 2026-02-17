import { useAction, useQuery } from "convex/react";
import React, { useState, useMemo } from 'react';
import { api } from "@/convex/_generated/api";
import { LayoutGrid, RefreshCw, Monitor, Smartphone, Globe2 } from 'lucide-react';

interface AppListProps {
    selectedItem: any;
    setSelectedItem: (item: any) => void;
    activeTenantId?: string;
    orgId?: string;
    searchQuery?: string;
}

const CLIENT_TYPE_CONFIG: Record<number, { label: string; color: string }> = {
    4: { label: "Web", color: "bg-slate-50 text-slate-600 border-slate-100" },
    5: { label: "Unified", color: "bg-indigo-50 text-indigo-600 border-indigo-100" },
};

export default function AppList({
    selectedItem,
    setSelectedItem,
    activeTenantId,
    orgId,
    searchQuery = ''
}: AppListProps) {
    const syncAllApps = useAction(api.actions.apps.syncAllApps);
    const listModelDrivenApps = useAction(api.actions.apps.listModelDrivenApps);

    const cachedApps = useQuery(api.queries.getModelDrivenApps, activeTenantId ? { tenantId: activeTenantId } : "skip");
    const cachedForms = useQuery(api.queries.getSystemForms, activeTenantId ? { tenantId: activeTenantId } : "skip");
    const cachedViews = useQuery(api.queries.getSystemViews, activeTenantId ? { tenantId: activeTenantId } : "skip");

    const [isSyncing, setIsSyncing] = useState(false);

    const handleSync = async () => {
        if (!activeTenantId) return;
        setIsSyncing(true);
        try {
            await syncAllApps({ tenantId: activeTenantId, orgId });
        } catch (error) {
            console.error("App landscape sync failed:", error);
        } finally {
            setIsSyncing(false);
        }
    };

    const lastSynced = cachedApps && cachedApps.length > 0
        ? Math.max(...cachedApps.map((a: any) => a.lastSynced || 0))
        : null;

    const formatTimeAgo = (timestamp: number) => {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ago`;
    };

    const filteredApps = useMemo(() => {
        if (!cachedApps) return [];
        if (!searchQuery) return cachedApps;
        const q = searchQuery.toLowerCase();
        return cachedApps.filter((app: any) =>
            app.name.toLowerCase().includes(q) ||
            (app.uniqueName && app.uniqueName.toLowerCase().includes(q))
        );
    }, [cachedApps, searchQuery]);

    // Count forms/views per app (approximate - by entity overlap)
    const formCount = cachedForms?.length || 0;
    const viewCount = cachedViews?.length || 0;

    return (
        <div className="w-80 border-r border-slate-200 overflow-y-auto bg-white shadow-sm z-0">
            <div className="p-4 border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur-md z-10">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h2 className="font-bold text-slate-800 text-xs tracking-wider uppercase mb-0.5">
                            Model-Driven Apps
                        </h2>
                        {lastSynced && (
                            <p className="text-[10px] text-slate-400 font-medium">
                                Synced {formatTimeAgo(lastSynced)}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className={`text-slate-400 hover:text-indigo-600 transition-colors p-1 rounded-md hover:bg-slate-100 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`}
                        title="Sync Apps, Forms & Views from Dynamics"
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>
                {cachedApps && cachedApps.length > 0 && (
                    <div className="flex gap-2 text-[10px] text-slate-400 font-medium">
                        <span>{cachedApps.length} apps</span>
                        <span>·</span>
                        <span>{formCount} forms</span>
                        <span>·</span>
                        <span>{viewCount} views</span>
                    </div>
                )}
            </div>

            <div className="divide-y divide-slate-50">
                {!cachedApps ? (
                    <div className="p-4 text-xs text-slate-400 text-center">Loading cache...</div>
                ) : cachedApps.length === 0 ? (
                    <div className="p-8 text-center">
                        <p className="text-xs text-slate-400 mb-3">No apps found.</p>
                        <button
                            onClick={handleSync}
                            className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded border border-indigo-100 hover:bg-indigo-100 transition-colors font-medium"
                        >
                            Sync Now
                        </button>
                    </div>
                ) : filteredApps.length === 0 ? (
                    <div className="p-8 text-center">
                        <p className="text-xs text-slate-400">No apps match &quot;{searchQuery}&quot;</p>
                    </div>
                ) : (
                    filteredApps.map((app: any) => {
                        const clientConfig = CLIENT_TYPE_CONFIG[app.clientType] || { label: `Type ${app.clientType || '?'}`, color: "bg-slate-50 text-slate-600 border-slate-100" };
                        return (
                            <div
                                key={app._id}
                                onClick={() => setSelectedItem(app)}
                                className={`p-4 cursor-pointer transition-all border-l-4 ${selectedItem?._id === app._id ? 'bg-indigo-50/50 border-indigo-500' : 'hover:bg-slate-50 border-transparent'}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <LayoutGrid size={14} className={selectedItem?._id === app._id ? "text-indigo-500" : "text-slate-400"} />
                                        <span className="font-semibold text-slate-900 text-sm truncate">{app.name}</span>
                                    </div>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${clientConfig.color}`}>
                                        {clientConfig.label}
                                    </span>
                                </div>
                                {app.uniqueName && (
                                    <div className="text-[10px] text-slate-400 font-mono truncate ml-6 mb-1">{app.uniqueName}</div>
                                )}
                                <div className="flex gap-3 text-[11px] text-slate-500 font-medium ml-6">
                                    {app.isManaged ? (
                                        <span className="text-sky-500">Managed</span>
                                    ) : (
                                        <span className="text-amber-500">Custom</span>
                                    )}
                                    {app.appVersion && (
                                        <span className="opacity-70">v{app.appVersion}</span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
