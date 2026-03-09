"use client";

import { useStore } from "@/store/useStore";
import { Card } from "@/components/ui/Card";
import { TrendingUp, Wallet, ArrowUpRight, Clock, AlertTriangle, Plus, Edit2, Trash2, Landmark, History, Save } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { useState, useEffect, useCallback } from "react";
import { Investment, BankAccount, WealthSnapshot } from "@/store/useStore";
import { createClient } from "@/lib/supabase";

export default function WealthPage() {
    const {
        user, household, wealth, investments, history, accounts, incomes,
        getExpiringAssets, updateLiquidity,
        addInvestment, deleteInvestment, updateInvestment,
        addAccount, updateAccount, deleteAccount, setHistory,
        addIncome, deleteIncome
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

    const [accIsPrimary, setAccIsPrimary] = useState(false);
    const [accIsShared, setAccIsShared] = useState(false);
    const [editAccIsPrimary, setEditAccIsPrimary] = useState(false);
    const [editAccIsShared, setEditAccIsShared] = useState(false);

    // Income State
    const [isAddingInc, setIsAddingInc] = useState(false);
    const [incAmount, setIncAmount] = useState("");
    const [incDesc, setIncDesc] = useState("");
    const [incAccId, setIncAccId] = useState("");
    const [isSubmittingInc, setIsSubmittingInc] = useState(false);

    // Transfer State
    const [isTransferring, setIsTransferring] = useState(false);
    const [fromAccId, setFromAccId] = useState("");
    const [toAccId, setToAccId] = useState("");
    const [transferAmount, setTransferAmount] = useState("");

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
            balance: Number(accBalance),
            is_primary: accIsPrimary,
            is_shared: accIsShared,
            household_id: accIsShared && household ? household.id : undefined
        };

        const { data, error } = await supabase.from("accounts").insert(newAcc).select().single();

        if (!error && data) {
            // Update other accounts if this one is primary
            if (accIsPrimary) {
                await supabase.from("accounts").update({ is_primary: false }).eq("user_id", user.id).neq("id", data.id);
                accounts.forEach(a => { if (a.is_primary) updateAccount(a.id, { is_primary: false }) });
            }

            addAccount({
                id: data.id,
                name: data.name,
                balance: Number(data.balance),
                is_primary: data.is_primary,
                is_shared: data.is_shared,
                household_id: data.household_id
            });
            setIsAddingAcc(false);
            setAccName(""); setAccBalance(""); setAccIsPrimary(false); setAccIsShared(false);
        }
    };

    const handleAddIncome = async () => {
        if (!user || !incAmount || !incDesc || !incAccId) return;
        setIsSubmittingInc(true);

        const amount = Number(incAmount);
        const selectedAcc = accounts.find(a => a.id === incAccId);
        if (!selectedAcc) return;

        // 1. Insert into incomes history
        const { data: incomeData, error: incomeError } = await supabase
            .from("incomes")
            .insert({
                user_id: user.id,
                account_id: incAccId,
                amount: amount,
                description: incDesc,
                date: new Date().toISOString()
            })
            .select()
            .single();

        if (!incomeError && incomeData) {
            // 2. Update Account Balance
            const newAccBalance = selectedAcc.balance + amount;
            await supabase.from("accounts").update({ balance: newAccBalance }).eq("id", incAccId);
            updateAccount(incAccId, { balance: newAccBalance });

            // 3. Update theoretical liquidity
            const newLiquidity = (wealth?.liquidity || 0) + amount;
            await supabase.from("wealth").update({ liquidity: newLiquidity }).eq("user_id", user.id);
            updateLiquidity(newLiquidity);

            // 4. Update local state
            addIncome({
                id: incomeData.id,
                user_id: incomeData.user_id,
                account_id: incomeData.account_id,
                amount: Number(incomeData.amount),
                description: incomeData.description,
                date: incomeData.date
            });

            // Reset form
            setIsAddingInc(false);
            setIncAmount("");
            setIncDesc("");
            setIncAccId("");
        }
        setIsSubmittingInc(false);
    };

    const handleDeleteIncome = async (incomeId: string) => {
        const income = incomes.find(i => i.id === incomeId);
        if (!income || !user) return;

        const { error } = await supabase.from("incomes").delete().eq("id", incomeId);
        if (!error) {
            // Revert balance change in account
            const acc = accounts.find(a => a.id === income.account_id);
            if (acc) {
                const newBalance = acc.balance - income.amount;
                await supabase.from("accounts").update({ balance: newBalance }).eq("id", acc.id);
                updateAccount(acc.id, { balance: newBalance });
            }

            // Revert theoretical liquidity
            const newLiquidity = (wealth?.liquidity || 0) - income.amount;
            await supabase.from("wealth").update({ liquidity: newLiquidity }).eq("user_id", user.id);
            updateLiquidity(newLiquidity);

            deleteIncome(incomeId);
        }
    };

    const startEditingAccount = (acc: BankAccount) => {
        setEditingAccId(acc.id);
        setEditAccName(acc.name);
        setEditAccBalance(acc.balance.toString());
        setEditAccIsPrimary(acc.is_primary || false);
        setEditAccIsShared(acc.is_shared || false);
    };

    const handleUpdateAccount = async () => {
        if (!editingAccId || !editAccName || !editAccBalance) return;

        const updatedAcc = {
            name: editAccName,
            balance: Number(editAccBalance),
            is_primary: editAccIsPrimary,
            is_shared: editAccIsShared,
            household_id: editAccIsShared && household ? household.id : undefined
        };

        const { error } = await supabase.from("accounts").update(updatedAcc).eq("id", editingAccId);

        if (!error) {
            if (editAccIsPrimary) {
                await supabase.from("accounts").update({ is_primary: false }).eq("user_id", user?.id).neq("id", editingAccId);
                accounts.forEach(a => { if (a.is_primary && a.id !== editingAccId) updateAccount(a.id, { is_primary: false }) });
            }

            updateAccount(editingAccId, updatedAcc);
            setEditingAccId(null);
        }
    };

    const handleDeleteAccount = async (id: string) => {
        const { error } = await supabase.from("accounts").delete().eq("id", id);
        if (!error) deleteAccount(id);
    };

    const handleTransfer = async () => {
        if (!fromAccId || !toAccId || !transferAmount || isTransferring || fromAccId === toAccId) return;
        setIsTransferring(true);

        const amount = Number(transferAmount);
        const fromAcc = accounts.find(a => a.id === fromAccId);
        const toAcc = accounts.find(a => a.id === toAccId);

        if (!fromAcc || !toAcc || fromAcc.balance < amount) {
            setIsTransferring(false);
            return;
        }

        const newFromBalance = fromAcc.balance - amount;
        const newToBalance = toAcc.balance + amount;

        const { error: errorFrom } = await supabase.from("accounts").update({ balance: newFromBalance }).eq("id", fromAccId);
        if (!errorFrom) {
            const { error: errorTo } = await supabase.from("accounts").update({ balance: newToBalance }).eq("id", toAccId);
            if (!errorTo) {
                updateAccount(fromAccId, { balance: newFromBalance });
                updateAccount(toAccId, { balance: newToBalance });
                setTransferAmount("");
                setFromAccId("");
                setToAccId("");
            } else {
                // Should ideally handle rollback
            }
        }
        setIsTransferring(false);
    };

    const handleSyncLiquidity = async () => {
        if (!user) return;
        const { error } = await supabase.from("wealth").update({ liquidity: totalRealAccounts }).eq("user_id", user.id);
        if (!error) {
            updateLiquidity(totalRealAccounts);
        }
    };

    // Month Closing Handler (Auto-save Logic)
    const handleCloseMonth = useCallback(async () => {
        if (!user) return;
        setIsClosingMonth(true);

        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toLocaleDateString('en-CA');

        let savingsVsPrev = 0;

        // Correctly find the previous month's snapshot (NOT the current month's one)
        const previousRecord = history.find(h => h.recordingDate < firstDayOfMonth);

        if (previousRecord) {
            const prevTotal = previousRecord.totalLiquidity + previousRecord.totalInvestments;
            savingsVsPrev = netWorth - prevTotal;
        } else {
            savingsVsPrev = netWorth;
        }

        const newSnapshot = {
            user_id: user.id,
            recording_date: firstDayOfMonth,
            total_liquidity: totalRealAccounts,
            total_investments: totalInvestments,
            savings_vs_previous: savingsVsPrev
        };

        const { data, error } = await supabase
            .from("wealth_history")
            .upsert(newSnapshot, { onConflict: 'user_id, recording_date' })
            .select()
            .single();

        if (!error && data) {
            // Refetch history to keep state in sync
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
        }
        setIsClosingMonth(false);
    }, [user, history, netWorth, totalRealAccounts, totalInvestments, supabase]);

    // Automatic Sync on load or when net worth changes (with 2s debounce to avoid spam during editing)
    useEffect(() => {
        if (!user) return;

        const timeoutId = setTimeout(() => {
            handleCloseMonth();
        }, 2000);

        return () => clearTimeout(timeoutId);
    }, [netWorth, user]); // Re-run when netWorth changes

    // Other handlers (Investments) mostly unchanged...
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
                <h1 className="text-2xl font-bold text-slate-800">Patrimonio</h1>
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

            {/* Bank Accounts Breakdown */}
            <div className="pt-4 mt-4 border-t border-slate-200">
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
                        <div className="flex flex-col gap-2 mb-3">
                            <div className="flex gap-2">
                                <input type="text" placeholder="Banco (ej. Santander)" value={accName} onChange={e => setAccName(e.target.value)} className="w-2/3 text-sm p-2 rounded-lg border border-blue-200" />
                                <input type="number" placeholder="Importe €" value={accBalance} onChange={e => setAccBalance(e.target.value)} className="w-1/3 text-sm p-2 rounded-lg border border-blue-200" />
                            </div>
                            <label className="flex items-center gap-2 text-sm text-slate-800 font-medium mt-1">
                                <input type="checkbox" checked={accIsPrimary} onChange={e => setAccIsPrimary(e.target.checked)} className="rounded text-blue-600 w-4 h-4" />
                                💳 Esta es mi cuenta principal
                            </label>
                            {household && (
                                <label className="flex items-center gap-2 text-sm text-slate-800 font-medium mt-1">
                                    <input type="checkbox" checked={accIsShared} onChange={e => setAccIsShared(e.target.checked)} className="rounded text-blue-600 w-4 h-4" />
                                    🤝 Compartir recuento de esta cuenta con mi pareja
                                </label>
                            )}
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
                                    <label className="flex items-center gap-2 text-sm text-slate-800 font-medium">
                                        <input type="checkbox" checked={editAccIsPrimary} onChange={e => setEditAccIsPrimary(e.target.checked)} className="rounded text-blue-600" />
                                        💳 Cuenta principal
                                    </label>
                                    {household && (
                                        <label className="flex items-center gap-2 text-sm text-slate-800 font-medium mt-1">
                                            <input type="checkbox" checked={editAccIsShared} onChange={e => setEditAccIsShared(e.target.checked)} className="rounded text-blue-600" />
                                            🤝 Compartida
                                        </label>
                                    )}
                                    <div className="flex gap-2">
                                        <button onClick={handleUpdateAccount} className="flex-1 py-1 text-xs font-bold text-white bg-blue-600 rounded">OK</button>
                                        <button onClick={() => setEditingAccId(null)} className="flex-1 py-1 text-xs text-slate-500 bg-slate-100 rounded">X</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center group">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-medium text-slate-800 text-sm">{acc.name}</h4>
                                            {acc.is_primary && <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-sm uppercase">Principal</span>}
                                            {acc.is_shared && <span className="text-[10px] font-bold bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-sm uppercase">Compartida</span>}
                                        </div>
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

                {accounts.length >= 2 && (
                    <div className="mt-4 p-4 border rounded-xl border-slate-200 bg-slate-50">
                        <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                            <ArrowUpRight size={14} className="text-blue-500" /> Traspasar Dinero
                        </h4>
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                                <select value={fromAccId} onChange={e => setFromAccId(e.target.value)} className="w-1/2 text-sm p-2 rounded-lg border border-slate-300 bg-white">
                                    <option value="">Desde...</option>
                                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.balance}€)</option>)}
                                </select>
                                <select value={toAccId} onChange={e => setToAccId(e.target.value)} className="w-1/2 text-sm p-2 rounded-lg border border-slate-300 bg-white">
                                    <option value="">Hacia...</option>
                                    {accounts.map(a => <option key={a.id} value={a.id} disabled={a.id === fromAccId}>{a.name}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-2 mt-1">
                                <input type="number" placeholder="Importe €" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} className="w-2/3 text-sm p-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-blue-500 outline-none" />
                                <button onClick={handleTransfer} disabled={!fromAccId || !toAccId || !transferAmount || isTransferring} className="w-1/3 text-xs font-bold text-white bg-blue-600 rounded-lg disabled:opacity-50">
                                    {isTransferring ? '...' : 'Transferir'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Historial de Ingresos */}
                <div className="mt-8 pt-6 border-t border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                            <ArrowUpRight size={18} className="text-emerald-500" /> Registro de Ingresos
                        </h3>
                        <button onClick={() => setIsAddingInc(!isAddingInc)} className="bg-emerald-100 text-emerald-600 hover:bg-emerald-200 p-2 rounded-full transition-colors">
                            <Plus size={16} />
                        </button>
                    </div>

                    {isAddingInc && (
                        <Card className="p-4 mb-4 border-emerald-100 bg-emerald-50/50">
                            <h4 className="text-sm font-semibold text-emerald-800 mb-3">Registrar Nuevo Ingreso</h4>
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    placeholder="Descripción (ej. Nómina Marzo, Venta Wallapop)"
                                    value={incDesc}
                                    onChange={e => setIncDesc(e.target.value)}
                                    className="w-full text-sm p-2 rounded-lg border border-emerald-200 focus:ring-1 focus:ring-emerald-500 outline-none"
                                />
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        placeholder="Importe €"
                                        value={incAmount}
                                        onChange={e => setIncAmount(e.target.value)}
                                        className="w-1/2 text-sm p-2 rounded-lg border border-emerald-200 focus:ring-1 focus:ring-emerald-500 outline-none"
                                    />
                                    <select
                                        value={incAccId}
                                        onChange={e => setIncAccId(e.target.value)}
                                        className="w-1/2 text-sm p-2 rounded-lg border border-emerald-200 bg-white"
                                    >
                                        <option value="">Ingresar en...</option>
                                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button onClick={() => setIsAddingInc(false)} className="flex-1 py-1.5 text-xs text-slate-500 bg-white rounded-lg border border-slate-200">Cancelar</button>
                                    <button
                                        onClick={handleAddIncome}
                                        disabled={!incDesc || !incAmount || !incAccId || isSubmittingInc}
                                        className="flex-1 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-lg disabled:opacity-50"
                                    >
                                        {isSubmittingInc ? 'Guardando...' : 'Registrar Ingreso'}
                                    </button>
                                </div>
                            </div>
                        </Card>
                    )}

                    <div className="space-y-2">
                        {incomes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10).map(inc => (
                            <div key={inc.id} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                                <div>
                                    <p className="text-sm font-medium text-slate-800">{inc.description}</p>
                                    <p className="text-[10px] text-slate-500">
                                        {new Date(inc.date).toLocaleDateString('es-ES')} • {accounts.find(a => a.id === inc.account_id)?.name || 'Cuenta borrada'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-emerald-600 font-bold text-sm">
                                        +{inc.amount.toLocaleString('es-ES')} €
                                    </div>
                                    <button
                                        onClick={() => handleDeleteIncome(inc.id)}
                                        className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {incomes.length === 0 && (
                            <div className="text-center p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm">
                                No hay ingresos registrados recientemente.
                            </div>
                        )}
                    </div>
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
