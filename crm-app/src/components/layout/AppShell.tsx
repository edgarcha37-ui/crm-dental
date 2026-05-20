'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import { ToastProvider } from '@/components/Toast';

/**
 * Decide si renderizar el shell del CRM (Sidebar + margen) o pantalla limpia.
 * En /login no mostramos Sidebar para que la card central tenga toda la viewport.
 *
 * ToastProvider envuelve TODO (incluido /login) para que cualquier feedback
 * de error (fallo de auth, API caída, etc.) se vea.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAuthScreen = pathname?.startsWith('/login');

    if (isAuthScreen) {
        return <ToastProvider>{children}</ToastProvider>;
    }

    return (
        <ToastProvider>
            <Sidebar />
            <main className="ml-[260px] min-h-screen">{children}</main>
        </ToastProvider>
    );
}
