"use client";

import { useStore } from "@/store/useStore";
import { Card } from "@/components/ui/Card";
import { useState } from "react";
import { NetWorthChart } from "@/components/NetWorthChart";
import { SharedDebtsWidget } from "@/components/SharedDebtsWidget";
import { Onboarding } from "@/components/Onboarding";
import { ExpensesChart } from "@/components/ExpensesChart";
import { SettingsMenu } from "@/components/SettingsMenu";
import { Wallet, PiggyBank, Receipt, Users, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";

export default function Home() {
    const { household, user: authUser, members, wealth, accounts, incomes, signOut, transactions } = useStore();
    const [view, setView] = useState<"private" | "shared">("private");

    // Calculate current month's income from the dynamic history
    const now = new Date();
    const currentMonthIncomes = incomes.filter(inc => {
        const incDate = new Date(inc.date);
        return incDate.getMonth() === now.getMonth() && incDate.getFullYear() === now.getFullYear();
    });
    const payroll = currentMonthIncomes.reduce((sum, inc) => sum + inc.amount, 0);

    if (!authUser) return null; // Esperando auth

    if (!household) {
        return <Onboarding />;
    }

    const partnerId = members.find(m => m.id !== authUser.id)?.id;
    const partnerName = members.find(m => m.id !== authUser.id)?.display_name || "Compañero";

    // Cálculos rápidos para la vista
    const personalTxs = transactions.filter(t => t.type === "personal" && t.paidBy === authUser.id);
    const sharedTxs = transactions.filter(t => t.type === "shared");

    const personalExpenses = personalTxs.reduce((acc, curr) => acc + curr.amount, 0);
    const totalSharedExpenses = sharedTxs.reduce((acc, curr) => acc + curr.amount, 0);

    // Current Month calculations
    const currentMonthTxs = personalTxs.filter(t => {
        const txDate = new Date(t.date);
        return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    });

    const currentMonthExpenses = currentMonthTxs.reduce((acc, curr) => acc + curr.amount, 0);
    const savingsThisMonth = payroll - currentMonthExpenses;
    const savingsRate = payroll > 0 ? (savingsThisMonth / payroll) * 100 : 0;

    // Chart Data Config
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
    const expensesByCategory = currentMonthTxs.reduce((acc, tx) => {
        acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
        return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(expensesByCategory).map(([name, value], idx) => ({
        name,
        value,
        color: COLORS[idx % COLORS.length]
    })).sort((a, b) => b.value - a.value);

    // AI Message Logic
    const getAiMessage = () => {
        if (payroll === 0) return { type: "neutral", text: "Añade una nómina a tu cuenta principal para calcular tus ahorros." };
        if (savingsRate >= 20) return { type: "success", text: `¡Excelente mes! Estás ahorrando un ${savingsRate.toFixed(0)}% de tus ingresos. Sigue así.` };
        if (savingsRate > 0) return { type: "warning", text: `Has ahorrado un ${savingsRate.toFixed(0)}%. Intenta acercarte a la regla del 20% para mayor seguridad.` };
        return { type: "danger", text: "Cuidado, este mes has gastado más de lo que ingresas. Revisa tus gastos." };
    };
    const aiMessage = getAiMessage();

    return (
        <div className="p-6 space-y-6">
            {/* Header & User Switch (Mock) */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Hola, {authUser.display_name}</h1>
                    <p className="text-sm text-slate-500 font-medium">{household.name}</p>
                </div>
                <div className="flex gap-2">
                    <SettingsMenu onSignOut={signOut} />
                    {/* El botón de Switch User ya no aplica en este flujo real de autolocalización, pero mantenemos una tarjeta de visualización opcional o simplemente lo quitamos */}
                </div>
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
                    {/* Resumen Principal */}
                    <div className="grid grid-cols-2 gap-3">
                        <Card className="p-4 bg-gradient-to-br from-blue-600 to-blue-700 text-white border-none shadow-md">
                            <div className="flex items-center gap-2 mb-1 opacity-90">
                                <Wallet size={16} />
                                <span className="text-xs font-medium uppercase tracking-wider">Ahorro Mensual</span>
                            </div>
                            <p className="text-2xl font-black">{savingsThisMonth.toFixed(0)} €</p>
                            <p className="text-[10px] mt-2 opacity-80 backdrop-blur-sm bg-white/10 inline-block px-2 py-0.5 rounded-full">
                                de {payroll}€ ingresos
                            </p>
                        </Card>
                        <Card className="p-4 bg-white border border-slate-100 shadow-sm relative overflow-hidden">
                            <div className="absolute -right-4 -bottom-4 opacity-5">
                                <PiggyBank size={80} />
                            </div>
                            <div className="flex items-center gap-2 text-slate-500 mb-1">
                                <PiggyBank size={16} />
                                <span className="text-xs font-medium uppercase tracking-wider">Liquidez</span>
                            </div>
                            <p className="text-2xl font-black text-slate-800">{wealth?.liquidity.toLocaleString('es-ES', { maximumFractionDigits: 0 }) || 0} €</p>
                        </Card>
                    </div>

                    {/* AI Feedback */}
                    <Card className={`p-4 border-l-4 ${aiMessage.type === 'success' ? 'bg-emerald-50 border-emerald-500' :
                        aiMessage.type === 'warning' ? 'bg-amber-50 border-amber-500' :
                            aiMessage.type === 'danger' ? 'bg-rose-50 border-rose-500' :
                                'bg-blue-50 border-blue-500'
                        }`}>
                        <div className="flex gap-3 items-start">
                            {aiMessage.type === 'success' ? <CheckCircle2 className="text-emerald-500 mt-0.5" size={18} /> :
                                aiMessage.type === 'warning' ? <AlertCircle className="text-amber-500 mt-0.5" size={18} /> :
                                    aiMessage.type === 'danger' ? <AlertCircle className="text-rose-500 mt-0.5" size={18} /> :
                                        <TrendingUp className="text-blue-500 mt-0.5" size={18} />}
                            <p className={`text-sm font-medium ${aiMessage.type === 'success' ? 'text-emerald-800' :
                                aiMessage.type === 'warning' ? 'text-amber-800' :
                                    aiMessage.type === 'danger' ? 'text-rose-800' :
                                        'text-blue-800'
                                }`}>
                                {aiMessage.text}
                            </p>
                        </div>
                    </Card>

                    {/* Gráfica de Gastos */}
                    <Card className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Receipt size={18} className="text-blue-500" /> Gastos del Mes
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">Distribución por categorías</p>
                            </div>
                        </div>
                        <ExpensesChart data={chartData} total={currentMonthExpenses} />

                        {/* Top Categorías */}
                        {chartData.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
                                {chartData.slice(0, 4).map((c, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                                        <span className="truncate text-slate-600 flex-1">{c.name}</span>
                                        <span className="font-semibold text-slate-800">{c.value}€</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    <div className="pt-2">
                        <h3 className="font-semibold text-slate-800 mb-3 px-1">Tus Movimientos Recientes</h3>
                        <div className="space-y-2.5">
                            {personalTxs.length > 0 ? personalTxs.slice(0, 5).map(t => (
                                <div key={t.id} className="flex justify-between items-center bg-white p-3.5 rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgb(0,0,0,0.02)]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                                            <Receipt size={16} className="text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800 text-sm">{t.description}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{t.category}</p>
                                        </div>
                                    </div>
                                    <span className="font-bold text-slate-800">-{t.amount} €</span>
                                </div>
                            )) : (
                                <p className="text-sm text-slate-500 text-center py-6 bg-slate-50 border border-dashed rounded-2xl">No hay gastos recientes registrados.</p>
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
                        <p className="text-3xl font-bold">Sumario Global</p>
                        <p className="text-sm opacity-80 mt-1">Acércate a Wealth para configurar esto</p>
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
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 uppercase">
                                            {members.find(m => m.id === t.paidBy)?.display_name?.substring(0, 2) || "U"}
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
