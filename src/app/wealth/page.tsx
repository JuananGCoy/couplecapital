"use client";

import { useStore } from "@/store/useStore";
import { Card } from "@/components/ui/Card";
import { TrendingUp, Wallet, ArrowUpRight, Clock, AlertTriangle, Plus, Edit2, Trash2, Landmark, History, Save } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { useState } from "react";
import { Investment, BankAccount, WealthSnapshot } from "@/store/useStore";
import { createClient } from "@/lib/supabase";

export default function WealthPage() {
    const {
        user, wealth, investments, history, accounts,
        getExpiringAssets, updateLiquidity, updateSalary,
        addInvestment, deleteInvestment, updateInvestment,
        addAccount, updateAccount, deleteAccount, setHistory
    } = useStore();

    const expiringAssets = getExpiringAssets();
    const supabase = createClient();

    // Accounts State
    const [isAddingAcc, setIsAddingAcc] = useState(false);
    const [accName, setAccName] = useState("");
    const [accBalance, setAccBalance] = useState("");
    const [editingAccId, setEditingAccId] = useState<string | null>(null);
    const [editAccName, setEditAccName] = useState("");
    const [editAccBalance, setEditAccBalance] = useState("");

    // Salary State
    const [isEditingSalary, setIsEditingSalary] = useState(false);
    const [newSalary, setNewSalary] = useState(wealth?.salary?.toString() || "0");
    const [isUpdatingSalary, setIsUpdatingSalary] = useState(false);

    // Investments State
    const [isAddingInv, setIsAddingInv] = useState(false);
    const [isSubmittingInv, setIsSubmittingInv] = useState(false);
    const [invName, setInvName] = useState("");
    const [invAmount, setInvAmount] = useState("");
    const [invCategory, setInvCategory] = useState<Investment["category"]>("RV");
    const [invApy, setInvApy] = useState("");
    const [invMaturity, setInvMaturity] = useState("");
    const [isDeletingInv, setIsDeletingInv] = useState<string | null>(null);

    const [editingInvId, setEditingInvId] = useState<string | null>(null);
    const [editInvName, setEditInvName] = useState("");
    const [editInvAmount, setEditInvAmount] = useState("");
    const [editInvCategory, setEditInvCategory] = useState<Investment["category"]>("RV");
    const [editInvApy, setEditInvApy] = useState("");
    const [editInvMaturity, setEditInvMaturity] = useState("");
    const [isUpdatingInv, setIsUpdatingInv] = useState(false);

    // Month closing state
    const [isClosingMonth, setIsClosingMonth] = useState(false);

    const totalInvestments = investments.reduce((acc, curr) => acc + curr.amount, 0);
    const totalRealAccounts = accounts.reduce((acc, curr) => acc + curr.balance, 0);
    const theoreticalLiquidity = wealth?.liquidity || 0;
    const netWorth = totalRealAccounts + totalInvestments;

    const isDescuadrado = Math.abs(totalRealAccounts - theoreticalLiquidity) > 0.1;

    // Accounts Handlers
    const handleAddAccount = async () => {
        if (!user || !accName || !accBalance) return;

        const newAcc = {
            user_id: user.id,
            name: accName,
            balance: Number(accBalance)
        };

        const { data, error } = await supabase.from("accounts").insert(newAcc).select().single();

        if (!error && data) {
            addAccount({
                id: data.id,
                name: data.name,
                balance: Number(data.balance)
            });
            setIsAddingAcc(false);
            setAccName(""); setAccBalance("");
        }
    };

    const startEditingAccount = (acc: BankAccount) => {
        setEditingAccId(acc.id);
        setEditAccName(acc.name);
        setEditAccBalance(acc.balance.toString());
    };

    const handleUpdateAccount = async () => {
        if (!editingAccId || !editAccName || !editAccBalance) return;

        const updatedAcc = {
            name: editAccName,
            balance: Number(editAccBalance)
        };

        const { error } = await supabase.from("accounts").update(updatedAcc).eq("id", editingAccId);

        if (!error) {
            updateAccount(editingAccId, updatedAcc);
            setEditingAccId(null);
        }
    };

    const handleDeleteAccount = async (id: string) => {
        const { error } = await supabase.from("accounts").delete().eq("id", id);
        if (!error) deleteAccount(id);
    };

    const handleSyncLiquidity = async () => {
        if (!user) return;
        const { error } = await supabase.from("wealth").update({ liquidity: totalRealAccounts }).eq("user_id", user.id);
        if (!error) {
            updateLiquidity(totalRealAccounts);
        }
    };

    // Month Closing Handler
    const handleCloseMonth = async () => {
        if (!user) return;
        setIsClosingMonth(true);

        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toLocaleDateString('en-CA'); // format: YYYY-MM-DD

        let previousSavings = 0;
        let savingsVsPrev = 0;

        if (history.length > 0) {
            // Compare against the most recent snapshot
            const prev = history[0];
            const prevTotal = prev.totalLiquidity + prev.totalInvestments;
            savingsVsPrev = netWorth - prevTotal;
        } else {
            // First time closing
            savingsVsPrev = netWorth;
        }

        const newSnapshot = {
            user_id: user.id,
            recording_date: firstDayOfMonth,
            total_liquidity: totalRealAccounts,
            total_investments: totalInvestments,
            savings_vs_previous: savingsVsPrev
        };

        // UPSERT behavior: if they close the month twice in the same month, we just overwrite
        const { data, error } = await supabase
            .from("wealth_history")
            .upsert(newSnapshot, { onConflict: 'user_id, recording_date' })
            .select()
            .single();

        if (!error && data) {
            // Sync liquidity automatically so "teórico" matches "real" right after closing month
            await handleSyncLiquidity();

            // To be safe, just refetch history or manually inject it
            const { data: latestHistory } = await supabase.from("wealth_history").select("*").eq("user_id", user.id).order("recording_date", { ascending: false });
            if (latestHistory) {
                setHistory(latestHistory.map(h => ({
                    id: h.id,
                    recordingDate: h.recording_date,
                    totalLiquidity: Number(h.total_liquidity),
                    totalInvestments: Number(h.total_investments),
                    savingsVsPrevious: Number(h.savings_vs_previous)
                })));
            }
        } else {
            alert("Error al guardar cierre de mes. ¿A lo mejor ya lo guardaste hoy?");
        }
        setIsClosingMonth(false);
    };

    // Other handlers (Salary, Investments) mostly unchanged...
    const handleUpdateSalary = async () => {
        if (!user || !wealth) return;
        setIsUpdatingSalary(true);
        const salaryAmount = Number(newSalary) || 0;
        const newTotalLiquidity = (wealth.liquidity || 0) + salaryAmount;

        const { error } = await supabase.from("wealth").update({ salary: salaryAmount, liquidity: newTotalLiquidity }).eq("user_id", user.id);

        setIsUpdatingSalary(false);
        if (!error) {
            updateSalary(salaryAmount);
            updateLiquidity(newTotalLiquidity);
            setIsEditingSalary(false);
        }
    };

    const handleAddInvestment = async () => {
        if (!user || !invName || !invAmount) return;
        setIsSubmittingInv(true);
        const newInv = { user_id: user.id, name: invName, amount: Number(invAmount), category: invCategory, apy: invApy ? Number(invApy) : null, maturity_date: invMaturity || null };
        const { data, error } = await supabase.from("investments").insert(newInv).select().single();
        setIsSubmittingInv(false);
        if (!error && data) {
            addInvestment({ id: data.id, name: data.name, amount: Number(data.amount), category: data.category as any, apy: data.apy ?? undefined, maturityDate: data.maturity_date ?? undefined });
            setIsAddingInv(false); setInvName(""); setInvAmount(""); setInvApy(""); setInvMaturity("");
        }
    };

    const handleDeleteInvestment = async (id: string) => {
        setIsDeletingInv(id);
        const { error } = await supabase.from("investments").delete().eq("id", id);
        setIsDeletingInv(null);
        if (!error) deleteInvestment(id);
    };

    const handleUpdateInvestment = async () => {
        if (!editingInvId || !editInvName || !editInvAmount) return;
        setIsUpdatingInv(true);
        const updatedInv = { name: editInvName, amount: Number(editInvAmount), category: editInvCategory, apy: editInvApy ? Number(editInvApy) : null, maturity_date: editInvMaturity || null };
        const { error } = await supabase.from("investments").update(updatedInv).eq("id", editingInvId);
        setIsUpdatingInv(false);
        if (!error) {
            updateInvestment(editingInvId, { name: editInvName, amount: Number(editInvAmount), category: editInvCategory, apy: editInvApy ? Number(editInvApy) : undefined, maturityDate: editInvMaturity || undefined });
            setEditingInvId(null);
        }
    };

    const formatMonth = (dateString: string) => {
        const d = new Date(dateString);
        return d.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }).toUpperCase();
    };

    // Calculate chart data based on history. Reversing for chronologial order.
    const historyChartData = [...history].reverse().map(h => ({
        name: formatMonth(h.recordingDate),
        ahorro: h.savingsVsPrevious,
        total: h.totalLiquidity + h.totalInvestments
    }));

    return (
        <div className="p-6 space-y-6 pb-20">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-semibold text-slate-800">Tu Patrimonio</h1>
                <button
                    onClick={handleCloseMonth}
                    disabled={isClosingMonth}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-1.5 rounded-full text-xs font-medium hover:bg-emerald-700 transition"
                >
                    <Save size={14} />
                    {isClosingMonth ? "Guardando..." : "Cierre de Mes"}
                </button>
            </div>

            {/* Net Worth Summary */}
            <Card className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-xl">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 opacity-80">
                        <TrendingUp size={16} />
                        <h2 className="font-medium text-sm">Patrimonio Real Total</h2>
                    </div>
                </div>
                <p className="text-4xl font-bold">{netWorth.toLocaleString('es-ES')} €</p>

                <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-white/5 p-3 rounded-xl border border-white/10 backdrop-blur-sm">
                        <span className="opacity-70 text-xs flex items-center gap-1 mb-1"><Landmark size={12} /> Liquidez Bancos</span>
                        <span className="font-medium text-xl block">{totalRealAccounts.toLocaleString('es-ES')} €</span>
                        {isDescuadrado && (
                            <div className="mt-2 pt-2 border-t border-white/10 text-xs">
                                <span className="text-orange-300 flex items-center gap-1">
                                    <AlertTriangle size={10} /> Teórico: {theoreticalLiquidity.toLocaleString('es-ES')}€
                                </span>
                                <button
                                    onClick={handleSyncLiquidity}
                                    className="mt-1 text-[10px] text-emerald-400 font-medium hover:underline"
                                >
                                    Sincronizar a saldos reales
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl border border-white/10 backdrop-blur-sm">
                        <span className="opacity-70 flex items-center gap-1 text-xs mb-1"><ArrowUpRight size={12} /> Activos Reales</span>
                        <span className="font-medium text-xl block">{totalInvestments.toLocaleString('es-ES')} €</span>
                    </div>
                </div>
            </Card>

            {/* Ahorro Mensual (Excel logic) */}
            {history.length > 0 && (
                <div className="pt-2">
                    <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                        <History size={18} className="text-slate-500" />
                        Historial de Ahorro
                    </h3>
                    <Card className="p-4 h-[180px] w-full bg-white shadow-sm border-slate-100">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={historyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: number) => [`${value.toLocaleString('es-ES')} €`, 'Ahorro mensual']}
                                />
                                <Bar dataKey="ahorro" radius={[4, 4, 0, 0]}>
                                    {historyChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.ahorro >= 0 ? '#10b981' : '#ef4444'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>

                    <div className="mt-3 overflow-x-auto pb-2">
                        <div className="flex gap-3 snap-x">
                            {history.slice(0, 4).map(h => (
                                <div key={h.id} className="min-w-[140px] snap-center bg-slate-50 border border-slate-100 p-3 rounded-xl text-center">
                                    <div className="text-xs text-slate-500 font-medium tracking-wide mb-1">{formatMonth(h.recordingDate)}</div>
                                    <div className={`font-bold ${h.savingsVsPrevious >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {h.savingsVsPrevious > 0 ? '+' : ''}{h.savingsVsPrevious.toLocaleString('es-ES')} €
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-1">Total: {(h.totalLiquidity + h.totalInvestments).toLocaleString('es-ES')}€</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Salary */}
            <div className="mt-4 pt-4 flex items-center justify-between border-t border-slate-200">
                <div>
                    <span className="opacity-70 text-xs block font-medium mb-1">Sueldo Neto Recurrente</span>
                    {isEditingSalary ? (
                        <div className="flex gap-2 items-center">
                            <input
                                type="number" value={newSalary} onChange={e => setNewSalary(e.target.value)}
                                className="w-24 bg-slate-50 text-slate-800 text-sm px-2 py-1.5 rounded border border-slate-300"
                                autoFocus
                            />
                            <button onClick={handleUpdateSalary} className="text-white bg-slate-800 px-3 py-1.5 rounded text-xs font-bold">
                                {isUpdatingSalary ? "..." : "OK"}
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 group">
                            <span className="font-semibold text-lg text-slate-800">{(wealth?.salary || 0).toLocaleString('es-ES')} €</span>
                            <button onClick={() => setIsEditingSalary(true)} className="p-1 hover:bg-slate-100 rounded text-slate-400 transition-colors">
                                <Edit2 size={12} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Bank Accounts Breakdown */}
            <div className="pt-4 border-t border-slate-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <Landmark size={18} className="text-slate-500" /> Cuentas Bancarias
                    </h3>
                    <button onClick={() => setIsAddingAcc(!isAddingAcc)} className="bg-slate-100 text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors">
                        <Plus size={16} />
                    </button>
                </div>

                {isAddingAcc && (
                    <Card className="p-4 mb-4 border-blue-100 bg-blue-50/50">
                        <h4 className="text-sm font-semibold text-blue-800 mb-3">Añadir Cuenta</h4>
                        <div className="flex gap-2 mb-3">
                            <input type="text" placeholder="Banco (ej. Santander)" value={accName} onChange={e => setAccName(e.target.value)} className="w-2/3 text-sm p-2 rounded-lg border border-blue-200" />
                            <input type="number" placeholder="Importe €" value={accBalance} onChange={e => setAccBalance(e.target.value)} className="w-1/3 text-sm p-2 rounded-lg border border-blue-200" />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setIsAddingAcc(false)} className="flex-1 py-1.5 text-xs text-slate-500 bg-white rounded-lg border border-slate-200">Cancelar</button>
                            <button onClick={handleAddAccount} disabled={!accName || !accBalance} className="flex-1 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg disabled:opacity-50">Guardar</button>
                        </div>
                    </Card>
                )}

                <div className="space-y-3">
                    {accounts.map(acc => (
                        <Card key={acc.id} className="p-3 shadow-sm border-slate-100">
                            {editingAccId === acc.id ? (
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <input type="text" value={editAccName} onChange={e => setEditAccName(e.target.value)} className="w-2/3 text-sm p-1.5 rounded border border-slate-300" />
                                        <input type="number" value={editAccBalance} onChange={e => setEditAccBalance(e.target.value)} className="w-1/3 text-sm p-1.5 rounded border border-slate-300" />
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={handleUpdateAccount} className="flex-1 py-1 text-xs font-bold text-white bg-blue-600 rounded">OK</button>
                                        <button onClick={() => setEditingAccId(null)} className="flex-1 py-1 text-xs text-slate-500 bg-slate-100 rounded">X</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center group">
                                    <div>
                                        <h4 className="font-medium text-slate-800 text-sm">{acc.name}</h4>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-semibold text-slate-800">{acc.balance.toLocaleString('es-ES')} €</span>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => startEditingAccount(acc)} className="p-1 text-slate-400 hover:text-blue-500"><Edit2 size={12} /></button>
                                            <button onClick={() => handleDeleteAccount(acc.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={12} /></button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Card>
                    ))}
                    {accounts.length === 0 && (
                        <div className="text-center p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm">
                            No tienes cuentas añadidas. Suma tus saldos aquí.
                        </div>
                    )}
                </div>
            </div>

            {/* Investments Breakdown */}
            <div className="pt-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <Wallet size={18} className="text-slate-500" /> Tus Inversiones
                    </h3>
                    <button onClick={() => setIsAddingInv(!isAddingInv)} className="bg-slate-100 text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors">
                        <Plus size={16} />
                    </button>
                </div>

                {isAddingInv && (
                    <Card className="p-4 mb-4 border-emerald-100 bg-emerald-50/50">
                        <h4 className="text-sm font-semibold text-emerald-800 mb-3">Añadir Activo</h4>
                        <div className="space-y-3">
                            <input type="text" placeholder="Nombre (ej. Indexado S&P 500)" value={invName} onChange={e => setInvName(e.target.value)} className="w-full text-sm p-2 rounded-lg border border-emerald-200" />
                            <div className="flex gap-2">
                                <input type="number" placeholder="Importe €" value={invAmount} onChange={e => setInvAmount(e.target.value)} className="w-1/2 text-sm p-2 rounded-lg border border-emerald-200" />
                                <select value={invCategory} onChange={e => setInvCategory(e.target.value as any)} className="w-1/2 text-sm p-2 rounded-lg border border-emerald-200 bg-white">
                                    <option value="RV">Renta Variable</option>
                                    <option value="Monetario">F. Monetario</option>
                                    <option value="Deposito">Depósito</option>
                                </select>
                            </div>
                            {invCategory === "Deposito" && (
                                <div className="flex gap-2">
                                    <input type="number" placeholder="% TAE" value={invApy} onChange={e => setInvApy(e.target.value)} className="w-1/3 text-sm p-2 rounded-lg border border-emerald-200" />
                                    <input type="date" value={invMaturity} onChange={e => setInvMaturity(e.target.value)} className="w-2/3 text-sm p-2 rounded-lg border border-emerald-200" />
                                </div>
                            )}
                            <div className="flex gap-2 pt-2">
                                <button onClick={() => setIsAddingInv(false)} className="flex-1 py-1.5 text-xs text-slate-500 bg-white rounded-lg border border-slate-200">Cancelar</button>
                                <button onClick={handleAddInvestment} disabled={!invName || !invAmount || isSubmittingInv} className="flex-1 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-lg disabled:opacity-50">Guardar</button>
                            </div>
                        </div>
                    </Card>
                )}

                <div className="space-y-3">
                    {investments.map(inv => (
                        <Card key={inv.id} className="p-3 shadow-sm border-slate-100">
                            {editingInvId === inv.id ? (
                                <div className="space-y-2">
                                    <input type="text" value={editInvName} onChange={e => setEditInvName(e.target.value)} className="w-full text-sm p-1.5 rounded border border-slate-300" />
                                    <div className="flex gap-2">
                                        <input type="number" value={editInvAmount} onChange={e => setEditInvAmount(e.target.value)} className="w-1/2 text-sm p-1.5 rounded border border-slate-300" />
                                        <select value={editInvCategory} onChange={e => setEditInvCategory(e.target.value as any)} className="w-1/2 text-sm p-1.5 rounded border border-slate-300">
                                            <option value="RV">Renta Variable</option>
                                            <option value="Monetario">F. Monetario</option>
                                            <option value="Deposito">Depósito</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={handleUpdateInvestment} disabled={isUpdatingInv} className="flex-1 py-1 text-xs font-bold text-white bg-emerald-600 rounded">OK</button>
                                        <button onClick={() => setEditingInvId(null)} className="flex-1 py-1 text-xs text-slate-500 bg-slate-100 rounded">X</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center group">
                                    <div>
                                        <h4 className="font-medium text-slate-800 text-sm flex items-center gap-1">
                                            {inv.name} {inv.category === "RV" && <ArrowUpRight size={10} className="text-emerald-500" />}
                                        </h4>
                                        <p className="text-[10px] text-slate-400 mt-0.5">{inv.category}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="font-semibold text-slate-800">{inv.amount.toLocaleString('es-ES')} €</span>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => {
                                                setEditingInvId(inv.id); setEditInvName(inv.name); setEditInvAmount(inv.amount.toString()); setEditInvCategory(inv.category); setEditInvApy(inv.apy?.toString() || ""); setEditInvMaturity(inv.maturityDate || "");
                                            }} className="p-1 px-1.5 text-xs text-slate-400 hover:bg-slate-100 rounded"><Edit2 size={12} /></button>
                                            <button onClick={() => handleDeleteInvestment(inv.id)} disabled={isDeletingInv === inv.id} className="p-1 px-1.5 text-xs text-slate-400 hover:bg-red-50 hover:text-red-500 rounded"><Trash2 size={12} /></button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Card>
                    ))}
                    {investments.length === 0 && (
                        <div className="text-center p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm">
                            No tienes inversiones añadidas.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
