import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TransactionType = "personal" | "shared";
export type SplitType = "50-50" | "custom";

export interface Transaction {
    id: string;
    amount: number;
    category: string;
    type: TransactionType;
    date: string;
    description: string;
    paidBy: "A" | "B";
    splitType?: SplitType;
    splitAmountA?: number;
    splitAmountB?: number;
}

export interface Investment {
    id: string;
    name: string;
    amount: number;
    category: "RV" | "Monetario" | "Deposito";
    apy?: number;
    maturityDate?: string;
}

export interface Subscription {
    id: string;
    name: string;
    cost: number;
    period: "mensual" | "anual";
    paidBy: "A" | "B";
}

export interface Goal {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    imageUrl?: string;
}

export interface UserState {
    id: "A" | "B";
    name: string;
    salary: number;
    liquidity: number;
    investments: Investment[];
}

export interface NetWorthDataPoint {
    date: string;
    amountA: number;
    amountB: number;
    total: number;
}

export interface AppState {
    currentUser: "A" | "B";
    users: {
        A: UserState;
        B: UserState;
    };
    transactions: Transaction[];
    netWorthHistory: NetWorthDataPoint[];
    subscriptions: Subscription[];
    goals: Goal[];
    switchUser: (userId: "A" | "B") => void;
    addTransaction: (t: Transaction) => void;

    // UI State
    isAddTxModalOpen: boolean;
    openAddTxModal: () => void;
    closeAddTxModal: () => void;

    // Wealth Management
    updateLiquidity: (amount: number) => void;
    addInvestment: (investment: Omit<Investment, "id">) => void;

    // Pro Features (Goals & Subs)
    addSubscription: (sub: Omit<Subscription, "id">) => void;
    deleteSubscription: (id: string) => void;
    addGoal: (goal: Omit<Goal, "id" | "currentAmount">) => void;
    updateGoalProgress: (id: string, amountToAdd: number) => void;
    deleteGoal: (id: string) => void;

    settleDebt: () => void;
    getDebtBalance: () => { amount: number; whoOwes: "A" | "B" | null };
    getExpiringAssets: () => Investment[];
}

const currentDate = new Date();
const in15Days = new Date();
in15Days.setDate(currentDate.getDate() + 15);
const in60Days = new Date();
in60Days.setDate(currentDate.getDate() + 60);

const initialTransactions: Transaction[] = [
    { id: "1", amount: 150, category: "Supermercado", type: "shared", date: "2024-05-01", description: "Mercadona", paidBy: "A", splitType: "50-50" },
    { id: "2", amount: 60, category: "Ocio", type: "shared", date: "2024-05-02", description: "Cena", paidBy: "B", splitType: "50-50" },
    { id: "3", amount: 45, category: "Personal", type: "personal", date: "2024-05-03", description: "Ropa", paidBy: "A" },
    { id: "4", amount: 120, category: "Hogar", type: "shared", date: "2024-05-05", description: "IKEA", paidBy: "A", splitType: "custom", splitAmountA: 20, splitAmountB: 100 },
];

export const useStore = create<AppState>()(
    persist(
        (set, get) => ({
            currentUser: "A",
            users: {
                A: {
                    id: "A",
                    name: "Juan",
                    salary: 2500,
                    liquidity: 5000,
                    investments: [
                        { id: "i1", name: "S&P 500", amount: 10000, category: "RV" },
                        { id: "i2", name: "Depósito Facto", amount: 5000, category: "Deposito", apy: 3.5, maturityDate: in15Days.toISOString().split("T")[0] }
                    ]
                },
                B: {
                    id: "B",
                    name: "María",
                    salary: 2800,
                    liquidity: 7000,
                    investments: [
                        { id: "i3", name: "MSCI World", amount: 15000, category: "RV" },
                        { id: "i4", name: "Fondo Monetario", amount: 3000, category: "Monetario" }
                    ]
                }
            },
            transactions: initialTransactions,
            subscriptions: [
                { id: "s1", name: "Netflix", cost: 15.99, period: "mensual", paidBy: "A" },
                { id: "s2", name: "Spotify Duo", cost: 14.99, period: "mensual", paidBy: "B" },
                { id: "s3", name: "Amazon Prime", cost: 49.90, period: "anual", paidBy: "A" },
                { id: "s4", name: "MyInvestor Premium", cost: 2.99, period: "mensual", paidBy: "B" }
            ],
            goals: [
                { id: "g1", name: "Entrada Casa - Adosado", targetAmount: 40000, currentAmount: 18500 }
            ],
            netWorthHistory: [
                { date: "Ene", amountA: 18000, amountB: 22000, total: 40000 },
                { date: "Feb", amountA: 18500, amountB: 23000, total: 41500 },
                { date: "Mar", amountA: 19200, amountB: 24000, total: 43200 },
                { date: "Abr", amountA: 20000, amountB: 25000, total: 45000 },
            ],
            isAddTxModalOpen: false,
            openAddTxModal: () => set({ isAddTxModalOpen: true }),
            closeAddTxModal: () => set({ isAddTxModalOpen: false }),

            updateLiquidity: (amount) => set((state) => ({
                users: {
                    ...state.users,
                    [state.currentUser]: {
                        ...state.users[state.currentUser],
                        liquidity: amount
                    }
                }
            })),

            addInvestment: (investment) => set((state) => {
                const newInv: Investment = { ...investment as Investment, id: `inv_${Date.now()}` };
                return {
                    users: {
                        ...state.users,
                        [state.currentUser]: {
                            ...state.users[state.currentUser],
                            investments: [...state.users[state.currentUser].investments, newInv]
                        }
                    }
                };
            }),

            // --- Pro Features Actions ---
            addSubscription: (sub) => set((state) => ({
                subscriptions: [...state.subscriptions, { ...sub, id: `sub_${Date.now()}` }]
            })),

            deleteSubscription: (id) => set((state) => ({
                subscriptions: state.subscriptions.filter(s => s.id !== id)
            })),

            addGoal: (goal) => set((state) => ({
                goals: [...state.goals, { ...goal, id: `goal_${Date.now()}`, currentAmount: 0 }]
            })),

            updateGoalProgress: (id, amountToAdd) => set((state) => ({
                goals: state.goals.map(g =>
                    g.id === id
                        ? { ...g, currentAmount: Math.min(g.targetAmount, g.currentAmount + amountToAdd) }
                        : g
                )
            })),

            deleteGoal: (id) => set((state) => ({
                goals: state.goals.filter(g => g.id !== id)
            })),

            switchUser: (userId) => set({ currentUser: userId }),
            addTransaction: (t) => set((state) => ({ transactions: [t, ...state.transactions] })),
            settleDebt: () => set((state) => ({
                transactions: [...state.transactions, {
                    id: Date.now().toString(),
                    amount: get().getDebtBalance().amount,
                    category: "Liquidación",
                    type: "shared",
                    date: new Date().toISOString().split('T')[0],
                    description: "Liquidación de deudas",
                    paidBy: get().getDebtBalance().whoOwes === "A" ? "A" : "B",
                    splitType: "custom",
                    splitAmountA: get().getDebtBalance().whoOwes === "A" ? get().getDebtBalance().amount : 0,
                    splitAmountB: get().getDebtBalance().whoOwes === "B" ? get().getDebtBalance().amount : 0,
                }]
            })),
            getDebtBalance: () => {
                let balance = 0; // Positive means B owes A, Negative means A owes B

                get().transactions.forEach(t => {
                    if (t.type === "shared" && t.category !== "Liquidación") {
                        if (t.splitType === "50-50") {
                            if (t.paidBy === "A") balance += t.amount / 2;
                            if (t.paidBy === "B") balance -= t.amount / 2;
                        } else if (t.splitType === "custom") {
                            // Si A pagó, B le debe su parte
                            if (t.paidBy === "A") balance += (t.splitAmountB || 0);
                            // Si B pagó, A le debe su parte
                            if (t.paidBy === "B") balance -= (t.splitAmountA || 0);
                        }
                    } else if (t.category === "Liquidación") {
                        balance = 0; // Settle implies returning to 0 for simplicity here, though a real engine is more complex
                    }
                });

                if (balance > 0) return { amount: balance, whoOwes: "B" };
                if (balance < 0) return { amount: Math.abs(balance), whoOwes: "A" };
                return { amount: 0, whoOwes: null };
            },
            getExpiringAssets: () => {
                const msEnUnDia = 24 * 60 * 60 * 1000;
                const ahora = new Date().getTime();
                const user = get().users[get().currentUser];

                return user.investments.filter(inv => {
                    if (inv.category !== 'Deposito' || !inv.maturityDate) return false;
                    const diasRestantes = (new Date(inv.maturityDate).getTime() - ahora) / msEnUnDia;
                    return diasRestantes >= 0 && diasRestantes <= 30; // 30 días o menos
                });
            }
        }),
        {
            name: 'couple-capital-storage', // clave para el localStorage
        }
    )
);
