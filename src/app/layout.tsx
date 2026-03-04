import type { Metadata } from "next";
import { BottomNav } from "@/components/BottomNav";
import { ClientWrapper } from "@/components/ClientWrapper";
import { AddTransactionModal } from "@/components/AddTransactionModal";
import "./globals.css";

export const metadata: Metadata = {
    title: "CoupleCapital",
    description: "Personal and Shared Finance Tracker for Couples",
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "CoupleCap",
    },
    formatDetection: {
        telephone: false,
    },
};

export const viewport = {
    themeColor: "#4f46e5",
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="es" className="antialiased">
            <body className="bg-background text-foreground min-h-screen pb-20 md:pb-0">
                <main className="max-w-md mx-auto min-h-screen bg-slate-50 md:border-x md:border-border md:shadow-sm relative">
                    <ClientWrapper>
                        <div className="min-h-[calc(100vh-64px)] pb-6 relative">
                            {children}
                            <AddTransactionModal />
                        </div>
                        <BottomNav />
                    </ClientWrapper>
                </main>
            </body>
        </html>
    );
}
