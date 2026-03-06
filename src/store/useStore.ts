import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TransactionType = "personal" | "shared";
export type SplitType = "50-50" | "custom";

export interface Transaction {
    id: string;
    type: TransactionType;
    amount: number;
    category: string;
    date: string;
    description: string;
    paidBy: string; // auth.uid of the payer
    splitType?: SplitType;
    splitAmountA?: number; // These should probably become a map or array later, but keep simple for now
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
    paidBy: string; // auth.uid
}

export interface Goal {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    imageUrl?: string;
}

export interface BankAccount {
    id: string;
    name: string;
    balance: number;
    is_primary?: boolean;
    payroll?: number;
}

export interface WealthSnapshot {
    id: string;
    recordingDate: string;
    totalLiquidity: number;
    totalInvestments: number;
    savingsVsPrevious: number;
}

export interface UserState {
    id: string; // Real auth.uid
    salary: number;
    liquidity: number;
    investments: Investment[];
}

export interface NetWorthDataPoint {
    date: string;
    amount: number; // Combined or personal depending on view, simplify to total for now
}

export interface AppUser {
    id: string;
    email: string;
    display_name: string;
    avatar_url?: string;
}

export interface Household {
    id: string;
    name: string;
    invite_code: string;
}

export interface AppState {
    // Auth & Context
    session: any | null;
    user: AppUser | null;
    household: Household | null;
    members: AppUser[];

    // Personal Financial Data
    wealth: {
        salary: number;
        liquidity: number;
    };
    investments: Investment[];
    accounts: BankAccount[]; // New
    history: WealthSnapshot[]; // New

    // Household Financial Data
    transactions: Transaction[];
    netWorthHistory: NetWorthDataPoint[];
    subscriptions: Subscription[];
    goals: Goal[];

    // UI State
    isAddTxModalOpen: boolean;
    openAddTxModal: () => void;
    closeAddTxModal: () => void;

    // Wealth Management
    updateLiquidity: (amount: number) => void;
    updateSalary: (amount: number) => void;
    addInvestment: (investment: Investment) => void;
    deleteInvestment: (id: string) => void;
    updateInvestment: (id: string, updates: Partial<Investment>) => void; // Modified signature

    addAccount: (a: BankAccount) => void; // New
    deleteAccount: (id: string) => void; // New
    updateAccount: (id: string, updates: Partial<BankAccount>) => void; // New

    // Pro Features (Goals & Subs)
    addSubscription: (s: Subscription) => void; // Modified signature
    deleteSubscription: (id: string) => void;
    addGoal: (g: Goal) => void; // Modified signature
    updateGoalProgress: (id: string, amountToAdd: number) => void;
    deleteGoal: (id: string) => void;

    addTransaction: (t: Transaction) => void; // Moved and modified signature
    deleteTransaction: (id: string) => void;

    settleDebt: () => void;
    getDebtBalance: () => { amount: number; whoOwes: string | null };
    getExpiringAssets: () => Investment[];

    // Supabase Sync Actions
    setUser: (user: any | null) => void; // Uses Supabase Auth User type
    setHousehold: (household: Household | null) => void;
    setMembers: (members: AppUser[]) => void;
    setWealth: (w: { salary: number, liquidity: number }) => void; // Modified parameter name
    setInvestments: (i: Investment[]) => void; // Modified parameter name
    setTransactions: (t: Transaction[]) => void; // Modified parameter name
    setSubscriptions: (s: Subscription[]) => void; // Modified parameter name
    setGoals: (g: Goal[]) => void; // Modified parameter name
    setAccounts: (a: BankAccount[]) => void; // New
    setHistory: (h: WealthSnapshot[]) => void; // New
    signOut: () => Promise<void>;
}

const currentDate = new Date();

export const useStore = create<AppState>()(
    persist(
        (set, get) => ({
            session: null,
            user: null,
            household: null,
            members: [],

            wealth: {
                salary: 0,
                liquidity: 0,
            },
            investments: [],
            transactions: [],
            subscriptions: [],
            goals: [],
            accounts: [], // New
            history: [], // New
            netWorthHistory: [],
            isAddTxModalOpen: false,

            setUser: (user) => { // Modified from setSession
                if (!user) {
                    set({ session: null, user: null, household: null, members: [] });
                    return;
                }
                // Assuming `user` here is the Supabase `User` object
                set({
                    session: get().session, // Keep existing session if available, or set to null if user is null
                    user: {
                        id: user.id,
                        email: user.email,
                        display_name: user.user_metadata?.display_name || user.email?.split('@')[0],
                        avatar_url: user.user_metadata?.avatar_url
                    }
                });
            },

            setHousehold: (household) => set({ household }),
            setMembers: (members) => set({ members }),
            setWealth: (wealth) => set({ wealth }),
            setInvestments: (investments) => set({ investments }),
            setTransactions: (transactions) => set({ transactions }),
            setSubscriptions: (subscriptions) => set({ subscriptions }),
            setGoals: (goals) => set({ goals }),
            setAccounts: (accounts) => set({ accounts }), // New
            setHistory: (history) => set({ history }), // New

            signOut: async () => {
                const { createClient } = await import("@/lib/supabase");
                const supabase = createClient();
                await supabase.auth.signOut();
                set({ session: null, user: null, household: null, members: [] });
            },

            openAddTxModal: () => set({ isAddTxModalOpen: true }),
            closeAddTxModal: () => set({ isAddTxModalOpen: false }),

            updateLiquidity: (amount) => set((state) => ({
                wealth: { ...state.wealth, liquidity: amount }
            })),
            updateSalary: (amount) => set((state) => ({
                wealth: { ...state.wealth, salary: amount }
            })),

            addInvestment: (investment) => set((state) => {
                return {
                    investments: [...state.investments, investment]
                };
            }),
            deleteInvestment: (id) => set((state) => ({
                investments: state.investments.filter(inv => inv.id !== id)
            })),
            updateInvestment: (id, updates) => set((state) => ({ // Modified signature
                investments: state.investments.map(inv => inv.id === id ? { ...inv, ...updates } : inv)
            })),

            addAccount: (a) => set((state) => ({ accounts: [...state.accounts, a] })), // New
            deleteAccount: (id) => set((state) => ({ accounts: state.accounts.filter(acc => acc.id !== id) })), // New
            updateAccount: (id, updates) => set((state) => ({ // New
                accounts: state.accounts.map(acc => acc.id === id ? { ...acc, ...updates } : acc)
            })),

            // --- Pro Features Actions ---
            addSubscription: (s) => set((state) => ({ // Modified signature
                subscriptions: [...state.subscriptions, s]
            })),

            deleteSubscription: (id) => set((state) => ({
                subscriptions: state.subscriptions.filter(s => s.id !== id)
            })),

            addGoal: (goal) => set((state) => ({
                goals: [...state.goals, goal]
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

            addTransaction: (t) => set((state) => ({ transactions: [t, ...state.transactions] })),
            deleteTransaction: (id) => set((state) => ({ transactions: state.transactions.filter(t => t.id !== id) })),
            settleDebt: () => {
                const balance = get().getDebtBalance();
                if (!balance.whoOwes || balance.amount === 0) return;
                set((state) => ({
                    transactions: [...state.transactions, {
                        id: Date.now().toString(),
                        amount: balance.amount,
                        category: "Liquidación",
                        type: "shared",
                        date: new Date().toISOString().split('T')[0],
                        description: "Liquidación de deudas",
                        paidBy: balance.whoOwes === get().user?.id ? get().user!.id : (balance.whoOwes as string), // The one who owes pays
                        splitType: "custom",
                        splitAmountA: 0,
                        splitAmountB: 0,
                    }]
                }));
            },
            getDebtBalance: () => {
                const me = get().user?.id;
                if (!me) return { amount: 0, whoOwes: null };

                let balance = 0; // Positive means partner owes ME, Negative means I owe partner

                get().transactions.forEach(t => {
                    if (t.type === "shared" && t.category !== "Liquidación") {
                        if (t.splitType === "50-50") {
                            if (t.paidBy === me) balance += t.amount / 2;
                            if (t.paidBy !== me) balance -= t.amount / 2;
                        } else if (t.splitType === "custom") {
                            // This logic will need to be updated to be truly dynamic with N members
                            // For now, assume custom splits are simplified or handle A/B gracefully
                            // Needs true transaction_splits implementation later.
                        }
                    } else if (t.category === "Liquidación") {
                        balance = 0;
                    }
                });

                if (balance > 0) return { amount: balance, whoOwes: "partner" };
                if (balance < 0) return { amount: Math.abs(balance), whoOwes: me };
                return { amount: 0, whoOwes: null };
            },
            getExpiringAssets: () => {
                const msEnUnDia = 24 * 60 * 60 * 1000;
                const ahora = new Date().getTime();

                return get().investments.filter((inv: Investment) => {
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
