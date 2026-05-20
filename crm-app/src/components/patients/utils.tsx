import { FileText, Image, File } from 'lucide-react';
import { ReactNode } from 'react';

export function getInitials(n: string): string {
    return n.split(' ').map(x => x[0] ?? '').join('').substring(0, 2).toUpperCase();
}

export function calcAge(dob: string | null | undefined): string {
    if (!dob) return '—';
    const years = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    return `${years} años`;
}

export function formatBytes(b: number): string {
    if (b >= 1048576) return (b / 1048576).toFixed(1) + ' MB';
    if (b >= 1024) return (b / 1024).toFixed(1) + ' KB';
    return b + ' B';
}

export function getFileIcon(tipo: string) {
    if (tipo?.includes('pdf')) return <FileText size={18} className="text-red-400" />;
    if (tipo?.includes('image')) return <Image size={18} className="text-blue-400" />;
    return <File size={18} className="text-gray-400" />;
}

export function EmptyState({ icon, text }: { icon: ReactNode; text: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            {icon}
            <p className="text-sm text-[var(--color-text-muted)]">{text}</p>
        </div>
    );
}
