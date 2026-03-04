"use client";

import { useEffect, useState } from "react";

export function ClientWrapper({ children }: { children: React.ReactNode }) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p className="text-slate-500 font-medium animate-pulse">Cargando...</p></div>;
    }

    return <>{children}</>;
}
