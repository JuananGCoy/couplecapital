"use client";

import { useState } from "react";
import { Plus, X, ArrowLeft } from "lucide-react";
import { useStore, Transaction, TransactionType, SplitType } from "@/store/useStore";

export function AddTransactionModal() {
    const { addTransaction, currentUser, users, isAddTxModalOpen, closeAddTxModal, openAddTxModal } = useStore();

    // Form state
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("Ocio");
    const [type, setType] = useState<TransactionType>("personal");
    const [paidBy, setPaidBy] = useState<"A" | "B">(currentUser);
    const [splitType, setSplitType] = useState<SplitType>("50-50");

    const categories = ["Ocio", "Supermercado", "Hogar", "Transporte", "Salud", "Personal", "Otro"];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !description) return;

        const numAmount = parseFloat(amount.replace(",", "."));
        if (isNaN(numAmount) || numAmount <= 0) return;

        const newTx: Transaction = {
            id: `tx_${Date.now()}`,
            amount: numAmount,
            category,
            type,
            date: new Date().toISOString().split("T")[0],
            description,
            paidBy,
            ...(type === "shared" ? { splitType } : {}),
        };

        addTransaction(newTx);
        closeModal();
    };

    const closeModal = () => {
        closeAddTxModal();
        setAmount("");
        setDescription("");
        setType("personal");
        setSplitType("50-50");
        setPaidBy(currentUser);
    };

    return (
        <>
            {/* Floating Action Button */}
            <button
                onClick={() => openAddTxModal()}
                className="fixed bottom-[88px] right-6 w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-[0_8px_30px_rgba(79,70,229,0.4)] hover:bg-indigo-700 transition-all hover:scale-105 z-40"
            >
                <Plus size={28} strokeWidth={2.5} />
            </button>

            {/* Bottom Sheet Modal */}
            {isAddTxModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className="w-full h-[90vh] sm:h-[80vh] sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-white">
                            <button onClick={closeModal} className="p-2 -ml-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full transition-colors">
                                <ArrowLeft size={20} />
                            </button>
                            <h2 className="text-lg font-bold text-gray-800">Nuevo Gasto</h2>
                            <div className="w-9" /> {/* Spacer */}
                        </div>

                        {/* Form scrollable content */}
                        <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50">
                            <form id="tx-form" onSubmit={handleSubmit} className="p-6 space-y-6 flex-1">

                                {/* Amount Input - Giant */}
                                <div className="text-center">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Importe</label>
                                    <div className="flex items-center justify-center gap-1 mt-2">
                                        <input
                                            type="number"
                                            step="0.01"
                                            inputMode="decimal"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="0"
                                            className="w-32 text-6xl font-black text-slate-800 bg-transparent text-center focus:outline-none placeholder:text-gray-300"
                                            autoFocus
                                        />
                                        <span className="text-4xl font-bold text-gray-400">€</span>
                                    </div>
                                </div>

                                {/* Shared vs Private Toggle */}
                                <div className="flex bg-gray-200/60 p-1.5 rounded-2xl w-full">
                                    <button
                                        type="button"
                                        onClick={() => setType("personal")}
                                        className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all ${type === "personal" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                                    >
                                        Gasto Privado
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setType("shared")}
                                        className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all ${type === "shared" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                                    >
                                        Gasto Compartido
                                    </button>
                                </div>

                                {/* Who pays (if shared) */}
                                {type === "shared" && (
                                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 block mb-3">¿Quién lo ha pagado?</label>
                                            <div className="flex gap-3">
                                                {(["A", "B"] as const).map((uid) => (
                                                    <button
                                                        key={uid}
                                                        type="button"
                                                        onClick={() => setPaidBy(uid)}
                                                        className={`flex-1 py-3 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all ${paidBy === uid ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                                                    >
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${uid === "A" ? "bg-indigo-400" : "bg-pink-400"}`}>
                                                            {users[uid].name[0]}
                                                        </div>
                                                        {users[uid].name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-gray-100">
                                            <label className="text-sm font-medium text-gray-700 block mb-3">División</label>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setSplitType("50-50")}
                                                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${splitType === "50-50" ? "bg-slate-800 text-white" : "bg-gray-100 text-gray-600"}`}
                                                >
                                                    50/50
                                                </button>
                                                {/* Puedes añadir más tipos aquí como 'custom' */}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Details */}
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 block mb-2">Concepto</label>
                                        <input
                                            type="text"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Ej. Cena en pizzería..."
                                            className="w-full border-b-2 border-gray-100 py-2 focus:border-indigo-500 focus:outline-none transition-colors bg-transparent text-gray-800"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 block mb-3">Categoría</label>
                                        <div className="flex flex-wrap gap-2">
                                            {categories.map((c) => (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    onClick={() => setCategory(c)}
                                                    className={`px-4 py-2 rounded-full text-xs font-medium transition-colors ${category === c ? "bg-indigo-100 text-indigo-700 border border-indigo-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent"}`}
                                                >
                                                    {c}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>


                            </form>

                            {/* Footer inside the scrolling area to avoid layout bugs */}
                            <div className="p-6 bg-white border-t border-gray-100 sm:rounded-b-3xl mt-auto">
                                <button
                                    type="submit"
                                    form="tx-form"
                                    disabled={!amount || !description}
                                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-black/5"
                                >
                                    Añadir Gasto
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
