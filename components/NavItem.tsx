
import React from 'react';

interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
}

export default function NavItem({ icon, label, active, onClick }: NavItemProps) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all font-medium ${active
                ? 'bg-white text-indigo-600 shadow-[0_4px_12px_rgba(0,0,0,0.2)]'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
        >
            <span className={active ? "text-indigo-600" : "text-slate-500"}>{icon}</span>
            <span className="flex-1 text-left">{label}</span>
            {active && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 ml-auto" />}
        </button>
    );
}
