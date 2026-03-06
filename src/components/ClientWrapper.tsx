"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import { SyncHandler } from "@/components/SyncHandler";
import { BottomNav } from "@/components/BottomNav";
import { AddTransactionModal } from "@/components/AddTransactionModal";

export function ClientWrapper({ children }: { children: React.ReactNode }) {
    const [isMounted, setIsMounted] = useState(false);
    const setUser = useStore(state => state.setUser);
    const supabase = createClient();

    useEffect(() => {
        setIsMounted(true);

        // Fetch initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user || null);
        });

        // Listen for changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
        });

        return () => subscription.unsubscribe();
    }, [setUser, supabase.auth]);

    const household = useStore(state => state.household);

    if (!isMounted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-primary animate-spin" />
                    <p className="text-slate-500 font-medium tracking-tight">Cargando CoupleCapital...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <SyncHandler />
            <div className={`min-h-[calc(100vh-64px)] ${household ? 'pb-6' : ''} relative`}>
                {children}
                {household && <AddTransactionModal />}
            </div>
            {household && <BottomNav />}
        </>
    );
}
