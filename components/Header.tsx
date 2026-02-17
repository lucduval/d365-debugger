
import React from 'react';
import { Search } from 'lucide-react';
import { Tenant } from './Sidebar';

interface HeaderProps {
    activeTenant: Tenant | null;
    searchQuery?: string;
    onSearchChange?: (query: string) => void;
}

export default function Header({ activeTenant, searchQuery = '', onSearchChange }: HeaderProps) {
    return (
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 transition-all">
            <div className="flex items-center gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search flows..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange?.(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-slate-200 rounded-full text-sm w-72 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                </div>
            </div>
            <div className="flex items-center gap-6">
                <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Current Env</span>
                    <span className="text-sm font-semibold text-indigo-600">
                        {activeTenant ? activeTenant.name : 'No Tenant Selected'}
                    </span>
                </div>
            </div>
        </header>
    );
}

