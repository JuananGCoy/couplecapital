"use client";

import { useState } from "react";
import { useStore, HouseholdTask } from "@/store/useStore";
import { createClient } from "@/lib/supabase";
import { Plus, Trash2, Check, Circle, Loader2, User } from "lucide-react";
import Image from "next/image";

export function TaskManager() {
    const { tasks, addTask, updateTask, deleteTask, household, user, members } = useStore();
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [assignedTo, setAssignedTo] = useState<string>("unassigned");
    const [isAdding, setIsAdding] = useState(false);
    const supabase = createClient();

    const pendingTasks = tasks.filter(task => !task.is_completed);
    const completedTasks = tasks.filter(task => task.is_completed);

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim() || !household || !user) return;

        setIsAdding(true);
        const title = newTaskTitle.trim();
        const assignee = assignedTo === "unassigned" ? null : assignedTo;

        setNewTaskTitle("");
        setAssignedTo("unassigned");

        const tempId = `temp-${Date.now()}`;
        const newTask: HouseholdTask = {
            id: tempId,
            household_id: household.id,
            title,
            assigned_to: assignee,
            is_completed: false
        };

        // UI Optimista
        addTask(newTask);

        // Subir a supabase
        const { data, error } = await supabase
            .from("household_tasks")
            .insert({
                household_id: household.id,
                title: title,
                assigned_to: assignee,
                is_completed: false
            })
            .select()
            .single();

        if (error) {
            console.error("Error adding task:", error);
            // Revertir
            deleteTask(tempId);
        } else if (data) {
            // Actualizar ID real
            updateTask(tempId, { id: data.id });
        }

        setIsAdding(false);
    };

    const handleToggleComplete = async (task: HouseholdTask) => {
        const newState = !task.is_completed;

        // Optimista
        updateTask(task.id, { is_completed: newState });

        // Supabase
        const { error } = await supabase
            .from("household_tasks")
            .update({ is_completed: newState })
            .eq("id", task.id);

        if (error) {
            console.error("Error toggling task:", error);
            // Revertir
            updateTask(task.id, { is_completed: task.is_completed });
        }
    };

    const handleDelete = async (id: string, isOptimistic = false) => {
        if (!isOptimistic) {
            const { error } = await supabase
                .from("household_tasks")
                .delete()
                .eq("id", id);
            if (error) {
                console.error("Error deleting task", error);
                return;
            }
        }
        deleteTask(id);
    };

    const getAssigneeAvatar = (userId: string | null) => {
        if (!userId) return null;
        const member = members.find(m => m.id === userId);
        if (!member) return <User className="w-3 h-3 text-slate-400" />;

        if (member.avatar_url) {
            return (
                <Image
                    src={member.avatar_url}
                    alt={member.display_name}
                    width={16}
                    height={16}
                    className="rounded-full shadow-sm"
                />
            );
        }
        return (
            <div className="w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-[8px] font-bold">
                {member.display_name.charAt(0).toUpperCase()}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <form onSubmit={handleAddTask} className="flex flex-col gap-3">
                <div className="relative">
                    <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Nueva tarea del hogar..."
                        className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-5 pr-14 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                        disabled={isAdding}
                    />
                    <button
                        type="submit"
                        disabled={!newTaskTitle.trim() || isAdding}
                        className="absolute right-2 top-2 bottom-2 aspect-square bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white flex items-center justify-center rounded-xl transition-colors shadow-sm"
                    >
                        {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                    </button>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                    <span className="text-xs text-slate-400 whitespace-nowrap font-medium">Asignar a:</span>
                    <button
                        type="button"
                        onClick={() => setAssignedTo("unassigned")}
                        className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 whitespace-nowrap transition-all ${assignedTo === "unassigned"
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "bg-white border border-slate-200 text-slate-500 hover:border-indigo-200"
                            }`}
                    >
                        <Circle className="w-3 h-3 dashed" />
                        Nadie
                    </button>
                    {members.map(m => (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => setAssignedTo(m.id)}
                            className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 whitespace-nowrap transition-all ${assignedTo === m.id
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "bg-white border border-slate-200 text-slate-500 hover:border-indigo-200"
                                }`}
                        >
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${assignedTo === m.id ? "bg-white/20" : ""}`}>
                                {getAssigneeAvatar(m.id)}
                            </div>
                            {m.display_name}
                        </button>
                    ))}
                </div>
            </form>

            <div className="space-y-8">
                {/* Tareas Pendientes */}
                <div className="space-y-3">
                    <h3 className="text-slate-500 font-semibold text-xs uppercase tracking-wider px-1">
                        Pendientes ({pendingTasks.length})
                    </h3>

                    {pendingTasks.length === 0 && (
                        <div className="bg-slate-100 border border-slate-200 rounded-2xl p-8 text-center text-slate-400 border-dashed">
                            ¡Todo limpio y ordenado!
                        </div>
                    )}

                    <div className="space-y-2">
                        {pendingTasks.map(task => (
                            <div key={task.id} className="group flex items-center gap-3 bg-white border border-slate-100 hover:border-indigo-200 p-4 rounded-2xl transition-all shadow-sm">
                                <button
                                    onClick={() => handleToggleComplete(task)}
                                    className="w-6 h-6 rounded-full border-2 border-slate-200 flex items-center justify-center shrink-0 transition-colors hover:border-indigo-500 bg-white"
                                >
                                </button>

                                <div className="flex-1 min-w-0">
                                    <span className="text-slate-700 font-medium block truncate">{task.title}</span>
                                    {task.assigned_to && (
                                        <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                                            Asignado a: {members.find(m => m.id === task.assigned_to)?.display_name || 'Desconocido'}
                                        </div>
                                    )}
                                </div>

                                {task.assigned_to && (
                                    <div className="shrink-0 flex items-center justify-center">
                                        {getAssigneeAvatar(task.assigned_to)}
                                    </div>
                                )}

                                <button
                                    onClick={() => handleDelete(task.id)}
                                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all ml-1"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tareas Completadas */}
                {completedTasks.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-slate-500 font-semibold text-xs uppercase tracking-wider px-1">
                            Completadas recientemente ({completedTasks.length})
                        </h3>

                        <div className="space-y-2">
                            {completedTasks.map(task => (
                                <div key={task.id} className="group flex items-center gap-3 bg-slate-50/50 p-4 rounded-2xl opacity-60 hover:opacity-100 transition-all border border-transparent hover:border-slate-200">
                                    <button
                                        onClick={() => handleToggleComplete(task)}
                                        className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>

                                    <div className="flex-1 min-w-0">
                                        <span className="text-slate-500 line-through block truncate">{task.title}</span>
                                    </div>

                                    <button
                                        onClick={() => handleDelete(task.id)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors ml-1"
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
