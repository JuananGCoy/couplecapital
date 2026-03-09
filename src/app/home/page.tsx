"use client";

import { useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { useStore } from "@/store/useStore";

// Se crearán estos componentes a continuación:
import { ShoppingList } from "@/components/home/ShoppingList";
import { TaskManager } from "@/components/home/TaskManager";
import { MealPlanner } from "@/components/home/MealPlanner";

type HomeTab = "compra" | "tareas" | "menu";

export default function HomeHubPage() {
    const [activeTab, setActiveTab] = useState<HomeTab>("compra");
    const user = useStore(state => state.user);

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="w-8 h-8 rounded-full border-t-2 border-r-2 border-indigo-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
            {/* Cabecera */}
            <header className="px-5 pt-12 pb-6 border-b border-slate-200 sticky top-0 bg-slate-50/80 backdrop-blur-xl z-20">
                <h1 className="text-2xl font-bold text-slate-800 mb-6">Tu Hogar</h1>

                {/* Segmented Control Tailwind/iOS style */}
                <div className="bg-slate-200 p-1 rounded-2xl flex relative overflow-hidden">
                    <div
                        className="absolute top-1 bottom-1 bg-white shadow-sm rounded-xl transition-all duration-300 ease-out"
                        style={{
                            width: 'calc(33.333% - 5.33px)',
                            left: activeTab === 'compra' ? '4px' : activeTab === 'tareas' ? 'calc(33.333% + 4px)' : 'calc(66.666% + 2px)'
                        }}
                    />

                    <button
                        onClick={() => setActiveTab("compra")}
                        className={`flex-1 py-2 text-sm font-medium z-10 transition-colors duration-200 ${activeTab === "compra" ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
                            }`}
                    >
                        Compra
                    </button>
                    <button
                        onClick={() => setActiveTab("tareas")}
                        className={`flex-1 py-2 text-sm font-medium z-10 transition-colors duration-200 ${activeTab === "tareas" ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
                            }`}
                    >
                        Tareas
                    </button>
                    <button
                        onClick={() => setActiveTab("menu")}
                        className={`flex-1 py-2 text-sm font-medium z-10 transition-colors duration-200 ${activeTab === "menu" ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
                            }`}
                    >
                        Menú
                    </button>
                </div>
            </header>

            {/* Contenido principal animado sutilmente al cambiar */}
            <main className="p-5 animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both" key={activeTab}>
                {activeTab === "compra" && (
                    <ShoppingList />
                )}
                {activeTab === "tareas" && (
                    <TaskManager />
                )}
                {activeTab === "menu" && (
                    <MealPlanner />
                )}
            </main>

            <BottomNav />
        </div>
    );
}
