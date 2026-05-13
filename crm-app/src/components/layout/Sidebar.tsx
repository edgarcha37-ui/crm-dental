'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    CalendarDays,
    BarChart3,
    StickyNote,
    Receipt,
    Settings,
} from 'lucide-react';

const navItems = [
    { href: '/', label: 'Panel', icon: LayoutDashboard },
    { href: '/patients', label: 'Pacientes', icon: Users },
    { href: '/appointments', label: 'Citas', icon: CalendarDays },
    { href: '/metrics', label: 'Métricas', icon: BarChart3 },
    { href: '/notes', label: 'Notas', icon: StickyNote },
    { href: '/billing', label: 'Facturación', icon: Receipt },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed left-0 top-0 h-screen w-[260px] bg-white border-r border-[var(--color-border-light)] flex flex-col z-30">
            {/* Logo */}
            <div className="px-6 py-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-blue)] flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="white" />
                    </svg>
                </div>
                <div>
                    <h1 className="text-lg font-bold text-[var(--color-text-primary)]">DentalCRM</h1>
                    <p className="text-xs text-[var(--color-text-muted)]">Gestión Clínica Moderna</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 mt-2">
                <ul className="space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href ||
                            (item.href !== '/' && pathname.startsWith(item.href));
                        const Icon = item.icon;

                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                                            ? 'bg-[var(--color-sidebar-active)] text-white shadow-md'
                                            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-text-primary)]'
                                        }`}
                                >
                                    <Icon size={20} />
                                    {item.label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Settings */}
            <div className="px-4 mb-4">
                <Link
                    href="/settings"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-text-primary)] transition-all duration-200"
                >
                    <Settings size={20} />
                    Configuración
                </Link>
            </div>

            {/* Doctor Profile */}
            <div className="px-4 pb-6 border-t border-[var(--color-border-light)] pt-4">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                        AT
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">Dr. Aris Thorne</p>
                        <p className="text-xs text-[var(--color-text-muted)]">Cirujano Principal</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
