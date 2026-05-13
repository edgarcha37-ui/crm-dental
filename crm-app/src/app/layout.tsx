import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "DentalCRM - Modern Clinic Management",
  description: "CRM para la gestión de pacientes y operación clínica de un consultorio dental",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} font-sans antialiased bg-[var(--color-bg-primary)]`}>
        <Sidebar />
        <main className="ml-[260px] min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
