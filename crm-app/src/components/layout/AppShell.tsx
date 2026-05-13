'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

/**
 * Decide si renderizar el shell del CRM (Sidebar + margen) o pantalla limpia.
 * En /login no mostramos Sidebar para que la card central tenga toda la viewport.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAuthScreen = pathname?.startsWith('/login');

    if (isAuthScreen) {
        return <>{children}</>;
    }

    return (
        <>
            <Sidebar />
            <main className="ml-[260px] min-h-screen">{children}</main>
        </>
    );
}
