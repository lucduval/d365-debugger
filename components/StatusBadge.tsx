
import React from 'react';

type Status = 'Active' | 'Warning' | 'Draft' | string;

interface StatusBadgeProps {
    status: Status;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
    const styles: Record<string, string> = {
        Active: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        Warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        Draft: 'bg-slate-500/10 text-slate-500 border-slate-500/20'
    };

    return (
        <span className={`text-[9px] px-2 py-0.5 rounded-md border font-black uppercase tracking-wider ${styles[status] || styles.Draft}`}>
            {status}
        </span>
    );
}
