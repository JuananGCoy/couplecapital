"use client";

import { useStore } from "@/store/useStore";
import { Card } from "@/components/ui/Card";
import { Receipt, ArrowRightLeft, Plus } from "lucide-react";
import { useState } from "react";

export default function ExpensesPage() {
    const { transactions, getDebtBalance, settleDebt, users, currentUser, openAddTxModal } = useStore();
    const balance = getDebtBalance();

    const partnerId = currentUser === "A" ? "B" : "A";
    const partnerName = users[partnerId].name;
    const userName = users[currentUser].name;

    const getBalanceMessage = () => {
        if (balance.amount === 0) return "Estáis en paz 🤝";
        if (balance.whoOwes === currentUser) return `Debes a ${partnerName}: ${balance.amount.toFixed(2)}€`;
        return `${partnerName} te debe: ${balance.amount.toFixed(2)}€`;
    };

    const getSettleButtonText = () => {
        if (balance.amount === 0) return null;
        if (balance.whoOwes === currentUser) return "Hacer Bizum / Liquidar";
        return "Marcar como Pagado";
    };

    const sharedTxs = transactions.filter(t => t.type === "shared");

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-slate-800">Gastos Comunes</h1>
                <button
                    onClick={openAddTxModal}
                    className="bg-primary hover:bg-emerald-600 text-white p-2 rounded-full transition-colors shadow-sm"
                >
                    <Plus size={20} />
                </button>
            </div>

            {/* Debt Engine Widget */}
            <Card className={`p-5 border-none shadow-md ${balance.amount === 0 ? "bg-slate-100 text-slate-800" :
                balance.whoOwes === currentUser ? "bg-red-50 text-red-900" : "bg-emerald-50 text-emerald-900"
                }`}>
                <div className="flex items-center gap-3 mb-3">
                    <ArrowRightLeft className={balance.amount === 0 ? "text-slate-500" : balance.whoOwes === currentUser ? "text-red-500" : "text-emerald-500"} />
                    <h2 className="font-semibold text-lg">{getBalanceMessage()}</h2>
                </div>
                {balance.amount > 0 && (
                    <button
                        onClick={settleDebt}
                        className={`w-full py-2.5 rounded-lg font-medium text-sm transition-colors ${balance.whoOwes === currentUser
                            ? "bg-red-600 hover:bg-red-700 text-white"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            }`}
                    >
                        {getSettleButtonText()}
                    </button>
                )}
            </Card>

            {/* Shared Expenses List */}
            <div>
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Receipt size={18} className="text-slate-500" />
                    Historial de Gastos
                </h3>
                <div className="space-y-3">
                    {sharedTxs.map(t => (
                        <Card key={t.id} className="p-4 flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${t.paidBy === currentUser ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-600"
                                        }`}>
                                        {users[t.paidBy].name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-800">{t.description}</p>
                                        <p className="text-xs text-slate-500">
                                            {t.category} • {new Date(t.date).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-slate-800">{t.amount.toFixed(2)} €</p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wide px-2 py-0.5 bg-slate-100 rounded-full inline-block mt-1">
                                        {t.splitType === "50-50" ? "Mitad" : "Personalizado"}
                                    </p>
                                </div>
                            </div>

                            {/* Resumen de división si es personalizado o detalle de quién pagó */}
                            <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
                                <span>Pagado por {users[t.paidBy].name}</span>
                                {t.splitType === "custom" && t.splitAmountA !== undefined && t.splitAmountB !== undefined && (
                                    <span>
                                        División: {users["A"].name} ({t.splitAmountA}€) - {users["B"].name} ({t.splitAmountB}€)
                                    </span>
                                )}
                            </div>
                        </Card>
                    ))}

                    {sharedTxs.length === 0 && (
                        <p className="text-center text-slate-500 py-8 text-sm">No hay gastos compartidos todavía.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
