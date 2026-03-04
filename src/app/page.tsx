"use client";

import { useStore } from "@/store/useStore";
import { Card } from "@/components/ui/Card";
import { useState } from "react";
import { Wallet, PiggyBank, Receipt, Users, User } from "lucide-react";
import { NetWorthChart } from "@/components/NetWorthChart";
import { SharedDebtsWidget } from "@/components/SharedDebtsWidget";

export default function Home() {
    const { users, currentUser, switchUser, transactions } = useStore();
    const [view, setView] = useState<"private" | "shared">("private");

    const user = users[currentUser];
    const partnerId = currentUser === "A" ? "B" : "A";
    const partner = users[partnerId];

    // Cálculos rápidos para la vista
    const personalTxs = transactions.filter(t => t.type === "personal" && t.paidBy === currentUser);
    const sharedTxs = transactions.filter(t => t.type === "shared");

    const personalExpenses = personalTxs.reduce((acc, curr) => acc + curr.amount, 0);
    const totalSharedExpenses = sharedTxs.reduce((acc, curr) => acc + curr.amount, 0);

    return (
        <div className="p-6 space-y-6">
            {/* Header & User Switch (Mock) */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-800">Hola, {user.name}</h1>
                    <p className="text-sm text-slate-500">Tu resumen financiero</p>
                </div>
                <button
                    onClick={() => switchUser(partnerId)}
                    className="bg-slate-200 p-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-slate-300 transition-colors"
                    title="Cambiar usuario (Mock)"
                >
                    <User size={16} />
                    {partner.name}
                </button>
            </div>

            {/* Toggle View */}
            <div className="flex bg-slate-200 p-1 rounded-xl">
                <button
                    onClick={() => setView("private")}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${view === "private" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
                        }`}
                >
                    Privado
                </button>
                <button
                    onClick={() => setView("shared")}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${view === "shared" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
                        }`}
                >
                    <Users size={16} />
                    Compartido
                </button>
            </div>

            {view === "private" ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                    <Card className="p-5 bg-primary text-primary-foreground border-none">
                        <div className="flex items-center gap-3 mb-2">
                            <Wallet className="opacity-80" />
                            <h2 className="font-medium opacity-90">Sueldo Neto</h2>
                        </div>
                        <p className="text-3xl font-bold">{user.salary} €</p>
                    </Card>

                    <div className="grid grid-cols-2 gap-4">
                        <Card className="p-4">
                            <div className="flex items-center gap-2 text-slate-500 mb-2">
                                <PiggyBank size={18} />
                                <span className="text-xs font-medium uppercase tracking-wider">Ahorros</span>
                            </div>
                            <p className="text-xl font-bold text-slate-800">{user.liquidity} €</p>
                        </Card>
                        <Card className="p-4">
                            <div className="flex items-center gap-2 text-slate-500 mb-2">
                                <Receipt size={18} />
                                <span className="text-xs font-medium uppercase tracking-wider">Gastos Priv.</span>
                            </div>
                            <p className="text-xl font-bold text-slate-800">{personalExpenses} €</p>
                        </Card>
                    </div>

                    <div className="pt-4">
                        <h3 className="font-semibold text-slate-800 mb-3">Tus Movimientos Recientes</h3>
                        <div className="space-y-3">
                            {personalTxs.length > 0 ? personalTxs.map(t => (
                                <div key={t.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-border">
                                    <div>
                                        <p className="font-medium text-slate-800">{t.description}</p>
                                        <p className="text-xs text-slate-500">{t.category}</p>
                                    </div>
                                    <span className="font-semibold text-slate-800">-{t.amount} €</span>
                                </div>
                            )) : (
                                <p className="text-sm text-slate-500 text-center py-4">No hay gastos privados recientes.</p>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                    <NetWorthChart />
                    <SharedDebtsWidget />

                    <Card className="p-5 bg-accent text-accent-foreground border-none">
                        <div className="flex items-center gap-3 mb-2">
                            <Users className="opacity-80" />
                            <h2 className="font-medium opacity-90">Progreso Familiar (Ingresos)</h2>
                        </div>
                        <p className="text-3xl font-bold">{user.salary + partner.salary} €</p>
                        <p className="text-sm opacity-80 mt-1">Suma de ambos sueldos</p>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center gap-2 text-slate-500 mb-2">
                            <Receipt size={18} />
                            <span className="text-xs font-medium uppercase tracking-wider">Gastos Comunes del Mes</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-800">{totalSharedExpenses} €</p>
                    </Card>

                    <div className="pt-4">
                        <h3 className="font-semibold text-slate-800 mb-3">Movimientos Compartidos</h3>
                        <div className="space-y-3">
                            {sharedTxs.slice(0, 5).map(t => (
                                <div key={t.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-border">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                                            {t.paidBy}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-800">{t.description}</p>
                                            <p className="text-xs text-slate-500">{t.category} • {t.splitType}</p>
                                        </div>
                                    </div>
                                    <span className="font-semibold text-slate-800">-{t.amount} €</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
