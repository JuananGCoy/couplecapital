"use client";

import { useStore } from "@/store/useStore";
import { Card } from "@/components/ui/Card";
import { TrendingUp, Wallet, ArrowUpRight, Clock, AlertTriangle, Plus, Edit2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useState } from "react";
import { Investment } from "@/store/useStore";

export default function WealthPage() {
    const { users, currentUser, netWorthHistory, getExpiringAssets, updateLiquidity, addInvestment } = useStore();
    const user = users[currentUser];
    const expiringAssets = getExpiringAssets();

    // UI State for Editing
    const [isEditingLiquidity, setIsEditingLiquidity] = useState(false);
    const [newLiquidity, setNewLiquidity] = useState(user.liquidity.toString());

    const [isAddingInv, setIsAddingInv] = useState(false);
    const [invName, setInvName] = useState("");
    const [invAmount, setInvAmount] = useState("");
    const [invCategory, setInvCategory] = useState<Investment["category"]>("RV");
    const [invApy, setInvApy] = useState("");
    const [invMaturity, setInvMaturity] = useState("");

    const totalInvestments = user.investments.reduce((acc, curr) => acc + curr.amount, 0);
    const netWorth = user.liquidity + totalInvestments;

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-semibold text-slate-800">Tu Patrimonio</h1>

            {/* Net Worth Summary */}
            <Card className="p-5 bg-slate-900 text-white border-none shadow-xl">
                <div className="flex items-center gap-3 mb-2 opacity-80">
                    <TrendingUp size={20} />
                    <h2 className="font-medium">Net Worth Total</h2>
                </div>
                <p className="text-4xl font-bold">{netWorth.toLocaleString('es-ES')} €</p>
                <div className="mt-4 flex gap-4 text-sm">
                    <div className="flex-1 bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                        <div className="flex justify-between items-center mb-1">
                            <span className="opacity-70 text-xs">Liquidez</span>
                            <button
                                onClick={() => setIsEditingLiquidity(!isEditingLiquidity)}
                                className="p-1 hover:bg-white/20 rounded-md transition-colors"
                            >
                                <Edit2 size={12} />
                            </button>
                        </div>

                        {isEditingLiquidity ? (
                            <div className="flex gap-2 items-center mt-2">
                                <input
                                    type="number"
                                    value={newLiquidity}
                                    onChange={e => setNewLiquidity(e.target.value)}
                                    className="w-full bg-slate-800 text-white text-sm px-2 py-1 rounded border border-slate-700 focus:outline-none"
                                    autoFocus
                                />
                                <button
                                    onClick={() => {
                                        updateLiquidity(Number(newLiquidity) || 0);
                                        setIsEditingLiquidity(false);
                                    }}
                                    className="text-emerald-400 font-bold text-xs bg-emerald-400/10 px-2 py-1.5 rounded"
                                >
                                    OK
                                </button>
                            </div>
                        ) : (
                            <span className="font-medium text-lg block">{user.liquidity.toLocaleString('es-ES')} €</span>
                        )}
                    </div>
                    <div className="flex-1 bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                        <span className="opacity-70 block text-xs mb-1">Inversiones</span>
                        <span className="font-medium text-lg block">{totalInvestments.toLocaleString('es-ES')} €</span>
                    </div>
                </div>
            </Card>

            {/* Alertas dinámicas si hay depósitos por vencer */}
            {expiringAssets.length > 0 && (
                <div className="space-y-2">
                    {expiringAssets.map(asset => (
                        <div key={asset.id} className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex gap-3 items-center shadow-sm">
                            <div className="p-2 bg-orange-100 text-orange-600 rounded-full">
                                <AlertTriangle size={20} />
                            </div>
                            <div className="flex-1">
                                <p className="text-orange-900 font-medium text-sm">
                                    Depósito ({asset.amount.toLocaleString('es-ES')}€) vence pronto
                                </p>
                                <p className="text-orange-700 text-xs mt-0.5">
                                    Finaliza el {new Date(asset.maturityDate!).toLocaleDateString('es-ES')}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Net Worth Chart */}
            <div className="pt-2">
                <h3 className="font-semibold text-slate-800 mb-4">Evolución (Compartida)</h3>
                <Card className="p-4 h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={netWorthHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                            <YAxis hide domain={['dataMin - 1000', 'dataMax + 1000']} />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: number) => [`${value} €`, 'Patrimonio Total']}
                            />
                            <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </Card>
            </div>

            {/* Investments Breakdown */}
            <div className="pt-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <Wallet size={18} className="text-slate-500" />
                        Tus Inversiones
                    </h3>
                    <button
                        onClick={() => setIsAddingInv(!isAddingInv)}
                        className="bg-slate-100 text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors"
                    >
                        <Plus size={16} />
                    </button>
                </div>

                {isAddingInv && (
                    <Card className="p-4 mb-4 border-emerald-100 bg-emerald-50/50 animate-in fade-in slide-in-from-top-2">
                        <h4 className="text-sm font-semibold text-emerald-800 mb-3">Añadir Activo</h4>
                        <div className="space-y-3">
                            <input
                                type="text" placeholder="Nombre (ej. S&P 500)"
                                value={invName} onChange={e => setInvName(e.target.value)}
                                className="w-full text-sm p-2 rounded-lg border border-emerald-200 outline-none focus:ring-2 ring-emerald-400"
                            />
                            <div className="flex gap-2">
                                <input
                                    type="number" placeholder="Importe €"
                                    value={invAmount} onChange={e => setInvAmount(e.target.value)}
                                    className="w-1/2 text-sm p-2 rounded-lg border border-emerald-200 outline-none focus:ring-2 ring-emerald-400"
                                />
                                <select
                                    value={invCategory}
                                    onChange={e => setInvCategory(e.target.value as any)}
                                    className="w-1/2 text-sm p-2 rounded-lg border border-emerald-200 outline-none focus:ring-2 ring-emerald-400 bg-white"
                                >
                                    <option value="RV">Renta Variable</option>
                                    <option value="Monetario">F. Monetario</option>
                                    <option value="Deposito">Depósito</option>
                                </select>
                            </div>

                            {invCategory === "Deposito" && (
                                <div className="flex gap-2">
                                    <input
                                        type="number" placeholder="% TAE"
                                        value={invApy} onChange={e => setInvApy(e.target.value)}
                                        className="w-1/3 text-sm p-2 rounded-lg border border-emerald-200 outline-none"
                                    />
                                    <input
                                        type="date"
                                        value={invMaturity} onChange={e => setInvMaturity(e.target.value)}
                                        className="w-2/3 text-sm p-2 rounded-lg border border-emerald-200 outline-none"
                                    />
                                </div>
                            )}

                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={() => setIsAddingInv(false)}
                                    className="flex-1 py-2 text-sm font-medium text-slate-500 bg-slate-100 rounded-lg"
                                >Cancelar</button>
                                <button
                                    onClick={() => {
                                        if (!invName || !invAmount) return;
                                        addInvestment({
                                            name: invName,
                                            amount: Number(invAmount),
                                            category: invCategory,
                                            apy: invApy ? Number(invApy) : undefined,
                                            maturityDate: invMaturity || undefined
                                        });
                                        setIsAddingInv(false);
                                        setInvName(""); setInvAmount(""); setInvApy(""); setInvMaturity("");
                                    }}
                                    className="flex-1 py-2 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
                                >Guardar</button>
                            </div>
                        </div>
                    </Card>
                )}

                <div className="space-y-3">
                    {user.investments.map(inv => (
                        <Card key={inv.id} className="p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-medium text-slate-800 flex items-center gap-2">
                                        {inv.name}
                                        {inv.category === "RV" && <ArrowUpRight size={14} className="text-accent" />}
                                    </h4>
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{inv.category}</p>
                                </div>
                                <p className="font-semibold text-slate-800">{inv.amount.toLocaleString('es-ES')} €</p>
                            </div>

                            {inv.maturityDate && (
                                <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                                    <span className="flex items-center gap-1 text-slate-500">
                                        <Clock size={12} />
                                        Vence: {new Date(inv.maturityDate).toLocaleDateString()}
                                    </span>
                                    {inv.apy && (
                                        <span className="font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                            {inv.apy}% TAE
                                        </span>
                                    )}
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
