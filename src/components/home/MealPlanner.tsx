"use client";

import { useState } from "react";
import { useStore, WeeklyMeal, DayOfWeek, MealType } from "@/store/useStore";
import { createClient } from "@/lib/supabase";
import { Plus, Trash2, X, Loader2, Check } from "lucide-react";

const DAYS_OF_WEEK: DayOfWeek[] = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export function MealPlanner() {
    const { meals, addMeal, updateMeal, deleteMeal, household, user } = useStore();
    const [addingFor, setAddingFor] = useState<{ day: DayOfWeek, type: MealType } | null>(null);
    const [recipeName, setRecipeName] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const supabase = createClient();

    const getMeal = (day: DayOfWeek, type: MealType) => {
        return meals.find(m => m.day_of_week === day && m.meal_type === type);
    };

    const handleSaveMeal = async () => {
        if (!addingFor || !recipeName.trim() || !household || !user) return;

        setIsSaving(true);
        const name = recipeName.trim();
        const { day, type } = addingFor;

        // Reset form
        setRecipeName("");
        setAddingFor(null);

        const tempId = `temp-${Date.now()}`;
        const newMeal: WeeklyMeal = {
            id: tempId,
            household_id: household.id,
            day_of_week: day,
            meal_type: type,
            recipe_name: name
        };

        // Optimistic UI
        addMeal(newMeal);

        const { data, error } = await supabase
            .from("weekly_meals")
            .insert({
                household_id: household.id,
                day_of_week: day,
                meal_type: type,
                recipe_name: name
            })
            .select()
            .single();

        if (error) {
            console.error("Error saving meal:", error);
            deleteMeal(tempId);
        } else if (data) {
            updateMeal(tempId, { id: data.id });
        }

        setIsSaving(false);
    };

    const handleDeleteMeal = async (id: string, isOptimistic = false) => {
        if (!isOptimistic) {
            const { error } = await supabase
                .from("weekly_meals")
                .delete()
                .eq("id", id);
            if (error) {
                console.error("Error deleting meal", error);
                return;
            }
        }
        deleteMeal(id);
    };

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                {DAYS_OF_WEEK.map(day => (
                    <div key={day} className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                        <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                            <h3 className="font-bold text-indigo-600 text-sm tracking-wide">{day}</h3>
                        </div>

                        <div className="divide-y divide-slate-100">
                            {/* Comida */}
                            <div className="p-4 flex flex-col gap-2">
                                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Comida</div>
                                {addingFor?.day === day && addingFor?.type === "Comida" ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            autoFocus
                                            type="text"
                                            value={recipeName}
                                            onChange={(e) => setRecipeName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSaveMeal()}
                                            placeholder="Ej. Macarrones con tomate"
                                            className="flex-1 bg-white border border-indigo-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                        />
                                        <button onClick={handleSaveMeal} className="p-2 bg-indigo-600 text-white rounded-xl shadow-sm hover:bg-indigo-700 transition-colors">
                                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        </button>
                                        <button onClick={() => setAddingFor(null)} className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    getMeal(day, "Comida") ? (
                                        <div className="flex items-center justify-between group">
                                            <span className="text-slate-700 text-sm font-medium">{getMeal(day, "Comida")!.recipe_name}</span>
                                            <button
                                                onClick={() => handleDeleteMeal(getMeal(day, "Comida")!.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setAddingFor({ day, type: "Comida" })}
                                            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all w-fit border border-dashed border-slate-300 px-4 py-2 rounded-xl"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Añadir menú
                                        </button>
                                    )
                                )}
                            </div>

                            {/* Cena */}
                            <div className="p-4 flex flex-col gap-2">
                                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Cena</div>
                                {addingFor?.day === day && addingFor?.type === "Cena" ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            autoFocus
                                            type="text"
                                            value={recipeName}
                                            onChange={(e) => setRecipeName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSaveMeal()}
                                            placeholder="Ej. Tortilla francesa"
                                            className="flex-1 bg-white border border-indigo-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                        />
                                        <button onClick={handleSaveMeal} className="p-2 bg-indigo-600 text-white rounded-xl shadow-sm hover:bg-indigo-700 transition-colors">
                                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        </button>
                                        <button onClick={() => setAddingFor(null)} className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    getMeal(day, "Cena") ? (
                                        <div className="flex items-center justify-between group">
                                            <span className="text-slate-700 text-sm font-medium">{getMeal(day, "Cena")!.recipe_name}</span>
                                            <button
                                                onClick={() => handleDeleteMeal(getMeal(day, "Cena")!.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setAddingFor({ day, type: "Cena" })}
                                            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all w-fit border border-dashed border-slate-300 px-4 py-2 rounded-xl"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Añadir menú
                                        </button>
                                    )
                                )}
                            </div>
                        </div>

                    </div>
                ))}
            </div>

        </div>
    );
}
