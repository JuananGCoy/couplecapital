"use client";

import { useStore } from "@/store/useStore";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

export function NetWorthChart() {
    const netWorthHistory = useStore((state) => state.netWorthHistory);
    const users = useStore((state) => state.users);

    // Formateador para mostrar Euros
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("es-ES", {
            style: "currency",
            currency: "EUR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    // Custom Tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-lg border border-gray-100">
                    <p className="font-semibold text-gray-800 mb-2">{label}</p>

                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm mb-1">
                            <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-gray-600">{entry.name}:</span>
                            <span className="font-semibold text-gray-900">
                                {formatCurrency(entry.value)}
                            </span>
                        </div>
                    ))}

                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between font-bold">
                        <span className="text-gray-800">Total:</span>
                        <span className="text-indigo-600">
                            {formatCurrency(payload.reduce((acc: number, curr: any) => acc + curr.value, 0))}
                        </span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 w-full">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-800">Crecimiento del Patrimonio</h3>
                <p className="text-sm text-gray-500">Evolución de ambos usuarios (Liquidez + RV + Depósitos)</p>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={netWorthHistory}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorUserA" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#818CF8" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#818CF8" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorUserB" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#F472B6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#F472B6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#6B7280", fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#6B7280", fontSize: 12 }}
                            tickFormatter={(value) => `${value / 1000}k`}
                            dx={-10}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="amountA"
                            name={users.A.name}
                            stackId="1"
                            stroke="#818CF8" // Indigo-400
                            strokeWidth={2}
                            fill="url(#colorUserA)"
                            animationDuration={1500}
                        />
                        <Area
                            type="monotone"
                            dataKey="amountB"
                            name={users.B.name}
                            stackId="1"
                            stroke="#F472B6" // Pink-400
                            strokeWidth={2}
                            fill="url(#colorUserB)"
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
