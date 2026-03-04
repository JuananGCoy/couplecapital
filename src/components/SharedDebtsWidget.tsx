"use client";

import { useStore } from "@/store/useStore";

export function SharedDebtsWidget() {
    const { getDebtBalance, users, settleDebt } = useStore();
    const balance = getDebtBalance();

    const getUserName = (id: "A" | "B") => users[id].name;

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Balance de Pareja</h3>

            {balance.whoOwes ? (
                <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100 flex justify-between items-center">
                    <div>
                        <p className="font-semibold text-orange-800 text-sm md:text-base">
                            {getUserName(balance.whoOwes)} debe a {getUserName(balance.whoOwes === "A" ? "B" : "A")}
                        </p>
                        <p className="text-orange-600 text-xs mt-1">Hay que ajustar cuentas</p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-bold text-orange-600">
                            {balance.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€
                        </p>
                        <button
                            onClick={settleDebt}
                            className="mt-3 text-xs font-bold px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors shadow-sm"
                        >
                            Liquidar deuda
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-green-50 rounded-2xl p-4 border border-green-100 flex items-center justify-center">
                    <p className="text-green-700 font-medium">✨ Cuentas claras, ¡todo al día!</p>
                </div>
            )}
        </div>
    );
}
