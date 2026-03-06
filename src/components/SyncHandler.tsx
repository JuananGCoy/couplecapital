"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useStore } from "@/store/useStore";

export function SyncHandler() {
    const user = useStore((state) => state.user);
    const household = useStore((state) => state.household);
    const setHousehold = useStore((state) => state.setHousehold);
    const setMembers = useStore((state) => state.setMembers);
    const setWealth = useStore((state) => state.setWealth);
    const setInvestments = useStore((state) => state.setInvestments);
    const setTransactions = useStore((state) => state.setTransactions);
    const setSubscriptions = useStore((state) => state.setSubscriptions);
    const setGoals = useStore((state) => state.setGoals);
    const setAccounts = useStore((state) => state.setAccounts);
    const setHistory = useStore((state) => state.setHistory);
    const supabase = createClient();

    useEffect(() => {
        if (!user) return;

        const fetchInitialData = async () => {
            // 1. Get user's households
            const { data: membershipData, error: mError } = await supabase
                .from("household_members")
                .select(`
          household_id,
          households (
            id,
            name,
            invite_code
          )
        `)
                .eq("user_id", user.id);

            if (mError || !membershipData || membershipData.length === 0) {
                console.log("User not in any household");
                setHousehold(null);
                return;
            }

            // For now, take the first household
            const h = membershipData[0].households;
            // Handle the fact that households might be an array or object depending on PostgREST
            const activeH = Array.isArray(h) ? h[0] : h;

            if (activeH) {
                setHousehold(activeH);

                // 2. Load members for this household
                const { data: members, error: memError } = await supabase
                    .from("household_members")
                    .select(`
            user_id,
            users (
              id,
              display_name,
              avatar_url,
              email
            )
          `)
                    .eq("household_id", activeH.id);

                if (!memError && members) {
                    const formattedMembers = members.map((m: any) => ({
                        id: m.users.id,
                        display_name: m.users.display_name,
                        avatar_url: m.users.avatar_url,
                        email: m.users.email
                    }));
                    setMembers(formattedMembers);
                }

                // 4. Load household data
                const [
                    { data: txData, error: txError },
                    { data: subData, error: subError },
                    { data: goalData, error: goalError }
                ] = await Promise.all([
                    supabase.from("transactions").select("*").eq("household_id", activeH.id).order('date', { ascending: false }),
                    supabase.from("subscriptions").select("*").eq("household_id", activeH.id),
                    supabase.from("goals").select("*").eq("household_id", activeH.id)
                ]);

                if (!txError && txData) {
                    setTransactions(txData.map(t => ({
                        id: t.id,
                        type: t.type,
                        amount: Number(t.amount),
                        category: t.category,
                        date: t.date,
                        description: t.description,
                        paidBy: t.paid_by,
                        splitType: t.split_type,
                        splitAmountA: t.split_amount_a,
                        splitAmountB: t.split_amount_b
                    })));
                }

                if (!subError && subData) {
                    setSubscriptions(subData.map(s => ({
                        id: s.id,
                        name: s.name,
                        cost: Number(s.cost),
                        period: s.period,
                        paidBy: s.paid_by
                    })));
                }

                if (!goalError && goalData) {
                    setGoals(goalData.map(g => ({
                        id: g.id,
                        name: g.name,
                        targetAmount: Number(g.target_amount),
                        currentAmount: Number(g.current_amount),
                        imageUrl: g.image_url
                    })));
                }
            }

            // 3. Load personal data (independent of household, but inside fetchInitialData)
            const [
                { data: wealthData },
                { data: invData, error: invError },
                { data: accData, error: accError },
                { data: histData, error: histError }
            ] = await Promise.all([
                supabase.from("wealth").select("*").eq("user_id", user.id).single(),
                supabase.from("investments").select("*").eq("user_id", user.id),
                supabase.from("accounts").select("*").eq("user_id", user.id),
                supabase.from("wealth_history").select("*").eq("user_id", user.id).order("recording_date", { ascending: false })
            ]);

            if (wealthData) {
                setWealth({ salary: Number(wealthData.salary), liquidity: Number(wealthData.liquidity) });
            } else {
                // Initialize if empty
                const { data: newWealth } = await supabase.from("wealth").insert({ user_id: user.id, salary: 0, liquidity: 0 }).select().single();
                if (newWealth) {
                    setWealth({ salary: Number(newWealth.salary), liquidity: Number(newWealth.liquidity) });
                }
            }

            if (!invError && invData) {
                setInvestments(invData.map(i => ({
                    id: i.id,
                    name: i.name,
                    amount: Number(i.amount),
                    category: i.category,
                    apy: i.apy ? Number(i.apy) : undefined,
                    maturityDate: i.maturity_date
                })));
            }

            if (!accError && accData) {
                setAccounts(accData.map(a => ({
                    id: a.id,
                    name: a.name,
                    balance: Number(a.balance),
                    is_primary: a.is_primary,
                    payroll: Number(a.payroll || 0)
                })));
            }

            if (!histError && histData) {
                setHistory(histData.map(h => ({
                    id: h.id,
                    recordingDate: h.recording_date,
                    totalLiquidity: Number(h.total_liquidity),
                    totalInvestments: Number(h.total_investments),
                    savingsVsPrevious: Number(h.savings_vs_previous)
                })));
            }
        };

        fetchInitialData();
    }, [user, setHousehold, setMembers, supabase]);

    // Real-time listener for household changes or invitation acceptance
    useEffect(() => {
        if (!user || household) return;

        const channel = supabase
            .channel('member-updates')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'household_members',
                filter: `user_id=eq.${user.id}`
            }, () => {
                // Re-fetch everything if we are added to a household
                window.location.reload();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, household, supabase]);

    return null;
}
