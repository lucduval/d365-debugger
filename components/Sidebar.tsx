
import React, { useState } from 'react';
import {
    Activity,
    Database,
    Link as LinkIcon,
    Cpu,
    ShieldCheck,
    RefreshCw,
    Plus,
    Globe,
    Trash2,
    Building2,
    Shield,
    Users,
    Code2,
    LayoutGrid,
    BarChart3,
    Settings,
    HardDrive,
    Server,
    ChevronDown,
    ChevronRight,
    Gauge,
} from 'lucide-react';
import NavItem from './NavItem';
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export interface Tenant {
    _id: string;
    tenantId: string;
    name: string;
    url: string;
    status?: string;
}

interface SidebarProps {
    tenants: Tenant[];
    activeTenant: Tenant | null;
    setActiveTenant: (tenant: Tenant) => void;
    setIsModalOpen: (isOpen: boolean) => void;
    selectedTab: string;
    setSelectedTab: (tab: string) => void;
}

interface NavSectionProps {
    label: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
    activeTab?: string;
    tabIds?: string[];
}

function NavSection({ label, children, defaultOpen = true, activeTab, tabIds = [] }: NavSectionProps) {
    const hasActiveChild = tabIds.includes(activeTab || '');
    const [isOpen, setIsOpen] = useState(defaultOpen || hasActiveChild);

    // Auto-expand when a child tab becomes active
    React.useEffect(() => {
        if (hasActiveChild && !isOpen) {
            setIsOpen(true);
        }
    }, [hasActiveChild]);

    return (
        <nav className="space-y-1">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full px-2 mb-1 group"
            >
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-pointer group-hover:text-slate-400 transition-colors">
                    {label}
                </label>
                <span className="text-slate-600 group-hover:text-slate-400 transition-colors">
                    {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </span>
            </button>
            <div
                className={`space-y-1 overflow-hidden transition-all duration-200 ease-in-out ${
                    isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
            >
                {children}
            </div>
        </nav>
    );
}

export default function Sidebar({
    tenants,
    activeTenant,
    setActiveTenant,
    setIsModalOpen,
    selectedTab,
    setSelectedTab
}: SidebarProps) {
    const deleteTenant = useMutation(api.mutations.deleteTenant);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to remove this tenant?")) {
            await deleteTenant({ id: id as Id<"tenants"> });
            if (activeTenant?._id === id && tenants.length > 0) {
                // The parent component should probably handle switching, but we can't easily do it here without passing prop.
            }
        }
    };

    return (
        <aside className="w-72 bg-slate-900 text-white flex flex-col border-r border-slate-800">
            <div className="p-6 flex items-center gap-3 border-b border-slate-800">
                <div className="bg-indigo-500 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
                    <Cpu size={24} />
                </div>
                <h1 className="font-bold text-lg tracking-tight italic">D365 Audit <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded ml-1 not-italic font-normal">v1.2</span></h1>
            </div>

            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                {/* Tenant / Project Selector */}
                <section>
                    <div className="flex items-center justify-between mb-2 px-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Tenant</label>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                    <div className="space-y-1">
                        {tenants.map(t => (
                            <div key={t._id} className="group relative">
                                <button
                                    onClick={() => setActiveTenant(t)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all text-left ${activeTenant?._id === t._id
                                        ? 'bg-slate-800 text-white ring-1 ring-slate-700'
                                        : 'text-slate-400 hover:bg-slate-800/50'
                                        }`}
                                >
                                    <Globe size={16} className={activeTenant?._id === t._id ? "text-indigo-400" : "text-slate-600"} />
                                    <div className="truncate flex-1">
                                        <p className="font-medium leading-none mb-1">{t.name}</p>
                                        <p className="text-[10px] text-slate-500 truncate">{t.url}</p>
                                    </div>
                                    <div
                                        onClick={(e) => handleDelete(e, t._id)}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-500/20 hover:text-rose-400 rounded text-slate-500 transition-all cursor-pointer"
                                    >
                                        <Trash2 size={14} />
                                    </div>
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="h-px bg-slate-800 mx-2 my-4" />

                {/* Environment Dashboard - Top-level */}
                <nav className="space-y-1">
                    <NavItem
                        icon={<Gauge size={18} />}
                        label="Environment Health"
                        active={selectedTab === 'dashboard'}
                        onClick={() => setSelectedTab('dashboard')}
                    />
                </nav>

                <div className="h-px bg-slate-800 mx-2 my-3" />

                {/* Discover Section */}
                <NavSection
                    label="Discover"
                    activeTab={selectedTab}
                    tabIds={['flows', 'tables', 'conn', 'webresources', 'apps']}
                >
                    <NavItem
                        icon={<Activity size={18} />}
                        label="Cloud Flows"
                        active={selectedTab === 'flows'}
                        onClick={() => setSelectedTab('flows')}
                    />
                    <NavItem
                        icon={<Database size={18} />}
                        label="Tables & Schema"
                        active={selectedTab === 'tables'}
                        onClick={() => setSelectedTab('tables')}
                    />
                    <NavItem
                        icon={<LinkIcon size={18} />}
                        label="Conn. References"
                        active={selectedTab === 'conn'}
                        onClick={() => setSelectedTab('conn')}
                    />
                    <NavItem
                        icon={<Code2 size={18} />}
                        label="Web Resources"
                        active={selectedTab === 'webresources'}
                        onClick={() => setSelectedTab('webresources')}
                    />
                    <NavItem
                        icon={<LayoutGrid size={18} />}
                        label="Model-Driven Apps"
                        active={selectedTab === 'apps'}
                        onClick={() => setSelectedTab('apps')}
                    />
                </NavSection>

                <div className="h-px bg-slate-800 mx-2 my-3" />

                {/* Security Section */}
                <NavSection
                    label="Security"
                    activeTab={selectedTab}
                    tabIds={['security-bu', 'security-roles', 'security-teams']}
                >
                    <NavItem
                        icon={<Building2 size={18} />}
                        label="Business Units"
                        active={selectedTab === 'security-bu'}
                        onClick={() => setSelectedTab('security-bu')}
                    />
                    <NavItem
                        icon={<Shield size={18} />}
                        label="Security Roles"
                        active={selectedTab === 'security-roles'}
                        onClick={() => setSelectedTab('security-roles')}
                    />
                    <NavItem
                        icon={<Users size={18} />}
                        label="Teams"
                        active={selectedTab === 'security-teams'}
                        onClick={() => setSelectedTab('security-teams')}
                    />
                </NavSection>

                <div className="h-px bg-slate-800 mx-2 my-3" />

                {/* Performance Section */}
                <NavSection
                    label="Performance"
                    activeTab={selectedTab}
                    tabIds={['telemetry', 'storage']}
                >
                    <NavItem
                        icon={<BarChart3 size={18} />}
                        label="App Telemetry"
                        active={selectedTab === 'telemetry'}
                        onClick={() => setSelectedTab('telemetry')}
                    />
                    <NavItem
                        icon={<HardDrive size={18} />}
                        label="Storage"
                        active={selectedTab === 'storage'}
                        onClick={() => setSelectedTab('storage')}
                    />
                </NavSection>

                <div className="h-px bg-slate-800 mx-2 my-3" />

                {/* Settings Section */}
                <NavSection
                    label="Settings"
                    activeTab={selectedTab}
                    tabIds={['settings-appinsights', 'settings-ppadmin']}
                    defaultOpen={false}
                >
                    <NavItem
                        icon={<Settings size={18} />}
                        label="App Insights"
                        active={selectedTab === 'settings-appinsights'}
                        onClick={() => setSelectedTab('settings-appinsights')}
                    />
                    <NavItem
                        icon={<Server size={18} />}
                        label="PP Admin API"
                        active={selectedTab === 'settings-ppadmin'}
                        onClick={() => setSelectedTab('settings-ppadmin')}
                    />
                </NavSection>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-1 text-slate-300">
                        <ShieldCheck size={14} className="text-emerald-400" />
                        <span className="text-xs font-semibold">Live Connection</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mb-2">Authenticated via Service Principal</p>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-700 mt-2">
                        <span className="text-[10px] text-slate-400">Token expires in 42m</span>
                        <RefreshCw size={10} className="text-slate-500 cursor-pointer hover:text-indigo-400" />
                    </div>
                </div>
            </div>
        </aside>
    );
}
