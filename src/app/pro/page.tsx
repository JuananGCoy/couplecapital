"use client";

import { useStore } from "@/store/useStore";
import { Card } from "@/components/ui/Card";
import { useState } from "react";
import { Target, BellRing, Repeat, Percent, Info, Plus, ArrowRight, Trash2 } from "lucide-react";

export default function ProFeaturesPage() {
    const { users, currentUser, subscriptions, goals, transactions, addGoal, updateGoalProgress, deleteGoal, addSubscription, deleteSubscription } = useStore();

    const user = users[currentUser];
    const partnerId = currentUser === "A" ? "B" : "A";
    const partnerName = users[partnerId].name;

    // Cálculos para Tasa de Ahorro Mensual (simplificado)
    const personalTxs = transactions.filter(t => t.type === "personal" && t.paidBy === currentUser);
    const personalExpenses = personalTxs.reduce((acc, curr) => acc + curr.amount, 0);

    const sharedTxs = transactions.filter(t => t.type === "shared");
    // Cuánto ha aportado el usuario actual a gastos comunes
    let sharedContribution = 0;
    sharedTxs.forEach(t => {
        if (t.splitType === "50-50") {
            sharedContribution += t.amount / 2;
        } else if (t.splitType === "custom") {
            sharedContribution += (currentUser === "A" ? (t.splitAmountA || 0) : (t.splitAmountB || 0));
        }
    });

    const totalMonthlySpend = personalExpenses + sharedContribution;
    const savingsAmount = user.salary - totalMonthlySpend;
    const savingsRate = Math.max(0, Math.round((savingsAmount / user.salary) * 100));

    // Alertas de vencimiento de inversiones (Mock)
    const investmentsExpiringSoon = user.investments.filter(i => {
        if (!i.maturityDate) return false;
        const daysUntilExpiry = (new Date(i.maturityDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
        return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
    });

    const totalSubsA = subscriptions.filter(s => s.paidBy === 'A').reduce((acc, s) => acc + (s.period === 'anual' ? s.cost / 12 : s.cost), 0);
    const totalSubsB = subscriptions.filter(s => s.paidBy === 'B').reduce((acc, s) => acc + (s.period === 'anual' ? s.cost / 12 : s.cost), 0);
    const myTotalSubs = subscriptions.filter(s => s.paidBy === currentUser).reduce((acc, s) => acc + (s.period === 'anual' ? s.cost / 12 : s.cost), 0);

    // UI States
    const [isAddingGoal, setIsAddingGoal] = useState(false);
    const [goalName, setGoalName] = useState("");
    const [goalTarget, setGoalTarget] = useState("");

    const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
    const [goalAddAmount, setGoalAddAmount] = useState("");

    const [isAddingSub, setIsAddingSub] = useState(false);
    const [subName, setSubName] = useState("");
    const [subCost, setSubCost] = useState("");
    const [subPeriod, setSubPeriod] = useState<"mensual" | "anual">("mensual");
    const [subPayer, setSubPayer] = useState<"A" | "B">(currentUser);

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-2">
                Pro Features <span className="bg-accent/10 text-accent text-xs px-2 py-0.5 rounded-full font-bold ml-1">BETA</span>
            </h1>

            {/* Goal Tracker */}
            <section>
                <div className="flex justify-between items-center mb-3">
                    <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                        <Target size={18} className="text-slate-500" />
                        Objetivos Comunes
                    </h2>
                    <button
                        onClick={() => setIsAddingGoal(!isAddingGoal)}
                        className="bg-slate-100 text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors"
                    >
                        <Plus size={16} />
                    </button>
                </div>

                {isAddingGoal && (
                    <Card className="p-4 mb-4 border-indigo-100 bg-indigo-50/50">
                        <h4 className="text-sm font-semibold text-indigo-800 mb-3">Nueva Meta</h4>
                        <div className="space-y-3">
                            <input
                                type="text" placeholder="Nombre de la meta"
                                value={goalName} onChange={e => setGoalName(e.target.value)}
                                className="w-full text-sm p-2 rounded-lg border border-indigo-200 outline-none focus:ring-2 ring-indigo-400"
                            />
                            <input
                                type="number" placeholder="Objetivo €"
                                value={goalTarget} onChange={e => setGoalTarget(e.target.value)}
                                className="w-full text-sm p-2 rounded-lg border border-indigo-200 outline-none focus:ring-2 ring-indigo-400"
                            />
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={() => setIsAddingGoal(false)}
                                    className="flex-1 py-2 text-sm font-medium text-slate-500 bg-slate-100 rounded-lg"
                                >Cancelar</button>
                                <button
                                    onClick={() => {
                                        if (!goalName || !goalTarget) return;
                                        addGoal({ name: goalName, targetAmount: Number(goalTarget) });
                                        setIsAddingGoal(false);
                                        setGoalName(""); setGoalTarget("");
                                    }}
                                    className="flex-1 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                                >Crear</button>
                            </div>
                        </div>
                    </Card>
                )}

                <div className="space-y-3">
                    {goals.map(goal => {
                        const progress = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                        return (
                            <Card key={goal.id} className="p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-medium text-slate-800">{goal.name}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-primary">{progress}%</span>
                                        <button onClick={() => deleteGoal(goal.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden">
                                    <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                </div>
                                <div className="flex justify-between text-xs text-slate-500 mb-3">
                                    <span>{goal.currentAmount.toLocaleString('es-ES')} € ahorrados</span>
                                    <span>Meta: {goal.targetAmount.toLocaleString('es-ES')} €</span>
                                </div>

                                {/* Aportar a la meta */}
                                {editingGoalId === goal.id ? (
                                    <div className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                                        <input
                                            type="number"
                                            placeholder="+ €"
                                            value={goalAddAmount}
                                            onChange={e => setGoalAddAmount(e.target.value)}
                                            className="w-full text-xs p-1.5 rounded-md border border-slate-200 outline-none"
                                            autoFocus
                                        />
                                        <button
                                            onClick={() => {
                                                if (goalAddAmount) updateGoalProgress(goal.id, Number(goalAddAmount));
                                                setEditingGoalId(null);
                                                setGoalAddAmount("");
                                            }}
                                            className="bg-primary text-white p-1.5 rounded-md"
                                        >
                                            <ArrowRight size={14} />
                                        </button>
                                        <button
                                            onClick={() => setEditingGoalId(null)}
                                            className="bg-slate-200 text-slate-500 px-2 py-1.5 rounded-md text-xs font-medium"
                                        >
                                            X
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setEditingGoalId(goal.id)}
                                        className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-medium rounded-lg transition-colors border border-slate-100"
                                    >
                                        + Aportar fondos
                                    </button>
                                )}
                            </Card>
                        )
                    })}
                </div>
            </section>

            {/* Savings Rate */}
            <section>
                <Card className="p-5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-md">
                    <div className="flex items-center gap-3 mb-2 opacity-90">
                        <Percent size={20} />
                        <h2 className="font-medium">Tasa de Ahorro Mensual</h2>
                    </div>
                    <div className="flex items-end justify-between mt-2">
                        <div>
                            <p className="text-4xl font-bold">{savingsRate}%</p>
                            <p className="text-sm opacity-80 mt-1">~ {savingsAmount.toFixed(0)} € este mes</p>
                        </div>
                    </div>
                </Card>
            </section>

            {/* Subscription Radar */}
            <section>
                <div className="flex justify-between items-center mb-3">
                    <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                        <Repeat size={18} className="text-slate-500" />
                        Radar de Suscripciones
                    </h2>
                    <button
                        onClick={() => setIsAddingSub(!isAddingSub)}
                        className="bg-slate-100 text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors"
                    >
                        <Plus size={16} />
                    </button>
                </div>

                {isAddingSub && (
                    <Card className="p-4 mb-4 border-indigo-100 bg-indigo-50/50">
                        <h4 className="text-sm font-semibold text-indigo-800 mb-3">Nueva Suscripción</h4>
                        <div className="space-y-3">
                            <input
                                type="text" placeholder="Servicio (ej. Netflix)"
                                value={subName} onChange={e => setSubName(e.target.value)}
                                className="w-full text-sm p-2 rounded-lg border border-indigo-200 outline-none focus:ring-2 ring-indigo-400"
                            />
                            <div className="flex gap-2">
                                <input
                                    type="number" placeholder="Coste €"
                                    value={subCost} onChange={e => setSubCost(e.target.value)}
                                    className="w-1/2 text-sm p-2 rounded-lg border border-indigo-200 outline-none"
                                />
                                <select
                                    value={subPeriod} onChange={e => setSubPeriod(e.target.value as "mensual" | "anual")}
                                    className="w-1/2 text-sm p-2 rounded-lg border border-indigo-200 outline-none bg-white"
                                >
                                    <option value="mensual">Mensual</option>
                                    <option value="anual">Anual</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">Paga:</span>
                                <div className="flex gap-2">
                                    {(["A", "B"] as const).map(uid => (
                                        <button
                                            key={uid}
                                            onClick={() => setSubPayer(uid)}
                                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${subPayer === uid ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
                                        >
                                            {users[uid].name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={() => setIsAddingSub(false)}
                                    className="flex-1 py-2 text-sm font-medium text-slate-500 bg-slate-100 rounded-lg"
                                >Cancelar</button>
                                <button
                                    onClick={() => {
                                        if (!subName || !subCost) return;
                                        addSubscription({ name: subName, cost: Number(subCost), period: subPeriod, paidBy: subPayer });
                                        setIsAddingSub(false);
                                        setSubName(""); setSubCost("");
                                    }}
                                    className="flex-1 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                                >Guardar</button>
                            </div>
                        </div>
                    </Card>
                )}

                <Card className="p-4">
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-border">
                        <div>
                            <p className="text-sm text-slate-500">Gasto mensual conjunto</p>
                            <p className="text-xl font-bold text-slate-800">{(totalSubsA + totalSubsB).toFixed(2)} €</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-slate-500">Pagas tú</p>
                            <p className="font-medium text-slate-800">{myTotalSubs.toFixed(2)} €/mes</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {subscriptions.map(sub => (
                            <div key={sub.id} className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${sub.paidBy === currentUser ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'}`}>
                                        {users[sub.paidBy].name.charAt(0)}
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">{sub.name}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-slate-600">
                                        {sub.cost.toFixed(2)} € <span className="text-[10px] text-slate-400">/{sub.period === 'mensual' ? 'mes' : 'año'}</span>
                                    </span>
                                    <button onClick={() => deleteSubscription(sub.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </section>

            {/* Alerts */}
            <section>
                <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <BellRing size={18} className="text-slate-500" />
                    Alertas ({investmentsExpiringSoon.length})
                </h2>
                {investmentsExpiringSoon.length > 0 ? (
                    <div className="space-y-3">
                        {investmentsExpiringSoon.map(inv => (
                            <Card key={inv.id} className="p-4 bg-orange-50 border-orange-100">
                                <div className="flex items-start gap-3">
                                    <Info className="text-orange-500 shrink-0 mt-0.5" size={18} />
                                    <div>
                                        <h3 className="font-medium text-orange-900 text-sm">Vencimiento Próximo</h3>
                                        <p className="text-xs text-orange-700 mt-1">
                                            Tu inversión "{inv.name}" vence el {new Date(inv.maturityDate!).toLocaleDateString()}. ¡No dejes tu dinero parado!
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-slate-500 text-center py-4 bg-white rounded-xl border border-border">No hay alertas pendientes.</p>
                )}
            </section>

            {/* Espaciador inferior extra para que el scroll supere el nav */}
            <div className="h-4"></div>
        </div>
    );
}
