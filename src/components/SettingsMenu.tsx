"use client";

import { useState, useRef, useEffect } from "react";
import { Settings, User, Lock, LogOut, X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/store/useStore";

export function SettingsMenu({ onSignOut }: { onSignOut: () => void }) {
    const { user, setUser } = useStore();
    const [isOpen, setIsOpen] = useState(false);

    // Modals state
    const [isNameModalOpen, setIsNameModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    // Form state
    const [newName, setNewName] = useState(user?.display_name || "");
    const [newPassword, setNewPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleChangeName = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || !user) return;

        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // 1. Update Auth Metadata
            const { data, error: authError } = await supabase.auth.updateUser({
                data: { display_name: newName.trim() }
            });

            if (authError) throw authError;

            // 2. Update Users Table
            const { error: dbError } = await supabase
                .from('users')
                .update({ display_name: newName.trim() })
                .eq('id', user.id);

            if (dbError) throw dbError;

            if (data.user) {
                setUser(data.user as any); // Update local store
            }

            setSuccess("Nombre actualizado con éxito");
            setTimeout(() => {
                setIsNameModalOpen(false);
                setSuccess(null);
            }, 1500);
        } catch (err: any) {
            setError(err.message || "Error al actualizar el nombre");
        } finally {
            setIsLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPassword || newPassword.length < 6) {
            setError("La contraseña debe tener al menos 6 caracteres");
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const { error: authError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (authError) throw authError;

            setSuccess("Contraseña actualizada con éxito");
            setNewPassword("");
            setTimeout(() => {
                setIsPasswordModalOpen(false);
                setSuccess(null);
            }, 1500);

        } catch (err: any) {
            setError(err.message || "Error al actualizar la contraseña");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all shadow-sm"
                title="Ajustes"
            >
                <Settings size={18} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-2 border-b border-slate-50 mb-1">
                        <p className="text-sm font-semibold text-slate-800 truncate">{user?.display_name}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    </div>

                    <button
                        onClick={() => { setIsOpen(false); setIsNameModalOpen(true); setNewName(user?.display_name || ""); setError(null); setSuccess(null); }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                    >
                        <User size={16} className="text-slate-400" />
                        <span>Cambiar Nombre</span>
                    </button>

                    <button
                        onClick={() => { setIsOpen(false); setIsPasswordModalOpen(true); setNewPassword(""); setError(null); setSuccess(null); }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                    >
                        <Lock size={16} className="text-slate-400" />
                        <span>Cambiar Contraseña</span>
                    </button>

                    <div className="h-px bg-slate-100 my-1"></div>

                    <button
                        onClick={() => { setIsOpen(false); onSignOut(); }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                    >
                        <LogOut size={16} className="text-red-400" />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            )}

            {/* Name Change Modal */}
            {isNameModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                <User size={18} className="text-primary" />
                                Cambiar Nombre
                            </h3>
                            <button onClick={() => setIsNameModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleChangeName} className="p-5 flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5 cursor-pointer">
                                    Nuevo nombre
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-800"
                                    placeholder="Tu nombre"
                                />
                            </div>

                            {error && <p className="text-sm text-red-500 bg-red-50 p-2 text-center rounded-lg">{error}</p>}
                            {success && <p className="text-sm text-green-600 bg-green-50 p-2 text-center rounded-lg">{success}</p>}

                            <div className="flex gap-3 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsNameModalOpen(false)}
                                    className="flex-1 py-2.5 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading || !newName.trim() || newName === user?.display_name}
                                    className="flex-1 py-2.5 rounded-xl font-medium text-white bg-primary hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : "Guardar"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Password Change Modal */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                <Lock size={18} className="text-primary" />
                                Cambiar Contraseña
                            </h3>
                            <button onClick={() => setIsPasswordModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleChangePassword} className="p-5 flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5 cursor-pointer">
                                    Nueva contraseña
                                </label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-800"
                                    placeholder="Mínimo 6 caracteres"
                                />
                            </div>

                            {error && <p className="text-sm text-red-500 bg-red-50 p-2 text-center rounded-lg">{error}</p>}
                            {success && <p className="text-sm text-green-600 bg-green-50 p-2 text-center rounded-lg">{success}</p>}

                            <div className="flex gap-3 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsPasswordModalOpen(false)}
                                    className="flex-1 py-2.5 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading || !newPassword || newPassword.length < 6}
                                    className="flex-1 py-2.5 rounded-xl font-medium text-white bg-primary hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : "Guardar"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
