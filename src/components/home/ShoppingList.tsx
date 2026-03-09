"use client";

import { useState } from "react";
import { useStore, ShoppingItem } from "@/store/useStore";
import { createClient } from "@/lib/supabase";
import { Plus, Trash2, Check, ShoppingBag, Loader2 } from "lucide-react";

export function ShoppingList() {
    const { shoppingItems, addShoppingItem, updateShoppingItem, deleteShoppingItem, household, user } = useStore();
    const [newItemName, setNewItemName] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const supabase = createClient();

    // Dividimos los items en 'por comprar' y 'comprados'
    const itemsToBuy = shoppingItems.filter(item => !item.is_checked);
    const itemsBought = shoppingItems.filter(item => item.is_checked);

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemName.trim() || !household || !user) return;

        setIsAdding(true);
        const name = newItemName.trim();
        setNewItemName("");

        const tempId = `temp-${Date.now()}`;
        const newItem: ShoppingItem = {
            id: tempId,
            household_id: household.id,
            name,
            is_checked: false
        };

        // UI Optimista
        addShoppingItem(newItem);

        // Subir a supabase
        const { data, error } = await supabase
            .from("shopping_items")
            .insert({
                household_id: household.id,
                name: name,
                is_checked: false
            })
            .select()
            .single();

        if (error) {
            console.error("Error adding shopping item:", error);
            // Revertir
            deleteShoppingItem(tempId);
        } else if (data) {
            // Actualizar ID real
            updateShoppingItem(tempId, { id: data.id });
        }

        setIsAdding(false);
    };

    const handleToggleCheck = async (item: ShoppingItem) => {
        const newState = !item.is_checked;

        // Optimista
        updateShoppingItem(item.id, { is_checked: newState });

        // Supabase
        const { error } = await supabase
            .from("shopping_items")
            .update({ is_checked: newState })
            .eq("id", item.id);

        if (error) {
            console.error("Error toggling shopping item:", error);
            // Revertir
            updateShoppingItem(item.id, { is_checked: item.is_checked });
        }
    };

    const handleDelete = async (id: string, isOptimistic = false) => {
        if (!isOptimistic) {
            const { error } = await supabase
                .from("shopping_items")
                .delete()
                .eq("id", id);
            if (error) {
                console.error("Error delete shopping item", error);
                // We don't have the original to revert easily, maybe we shouldn't optimistically delete
                return;
            }
        }
        deleteShoppingItem(id);
    };

    return (
        <div className="space-y-6">
            <form onSubmit={handleAddItem} className="relative">
                <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Añadir producto a la lista..."
                    className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-5 pr-14 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                    disabled={isAdding}
                />
                <button
                    type="submit"
                    disabled={!newItemName.trim() || isAdding}
                    className="absolute right-2 top-2 bottom-2 aspect-square bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white flex items-center justify-center rounded-xl transition-colors shadow-sm"
                >
                    {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                </button>
            </form>

            <div className="space-y-8">
                {/* Items por comprar */}
                <div className="space-y-3">
                    <h3 className="text-slate-500 font-semibold text-xs uppercase tracking-wider px-1 flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4" />
                        Por Comprar ({itemsToBuy.length})
                    </h3>

                    {itemsToBuy.length === 0 && (
                        <div className="bg-slate-100 border border-slate-200 rounded-2xl p-8 text-center text-slate-400 border-dashed">
                            ¡Tienes todo comprado!
                        </div>
                    )}

                    <div className="space-y-2">
                        {itemsToBuy.map(item => (
                            <div key={item.id} className="group flex items-center gap-3 bg-white border border-slate-100 hover:border-indigo-200 p-4 rounded-2xl transition-all shadow-sm">
                                <button
                                    onClick={() => handleToggleCheck(item)}
                                    className="w-6 h-6 rounded-full border-2 border-slate-200 flex items-center justify-center shrink-0 transition-colors hover:border-indigo-500 bg-white"
                                >
                                </button>
                                <span className="flex-1 text-slate-700 font-medium">{item.name}</span>
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Items comprados */}
                {itemsBought.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-slate-500 font-semibold text-xs uppercase tracking-wider flex items-center gap-2">
                                <Check className="w-4 h-4" />
                                Comprados recientemente ({itemsBought.length})
                            </h3>
                        </div>

                        <div className="space-y-2">
                            {itemsBought.map(item => (
                                <div key={item.id} className="group flex items-center gap-3 bg-slate-50/50 border border-transparent p-4 rounded-2xl opacity-60 hover:opacity-100 transition-all">
                                    <button
                                        onClick={() => handleToggleCheck(item)}
                                        className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <span className="flex-1 text-slate-500 line-through">{item.name}</span>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
