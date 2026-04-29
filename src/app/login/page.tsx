"use client";

import React, { useState, useTransition } from 'react';
import { Activity, Mail, Lock, ArrowRight, Check } from 'lucide-react';
import { login, signup } from './actions';
import { cn } from '@/shared/lib/cn';

export default function LoginPage() {
    // Mode d'affichage : "login" ou "signup"
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [isPending, startTransition] = useTransition();
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Contrôlé ou FormData : on utilise FormData natif
    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrorMsg(null);
        
        const formData = new FormData(event.currentTarget);
        
        startTransition(async () => {
            const action = mode === 'login' ? login : signup;
            const result = await action(formData);
            
            // Si result est présent, c'est qu'il y a une erreur (car en cas de succès, la redirection arrête l'exécution)
            if (result?.error) {
                setErrorMsg(result.error);
            }
        });
    }

    return (
        <div className="min-h-screen bg-[var(--color-bg-surface)] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                
                {/* Logo Section */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-soft)] rounded-2xl flex items-center justify-center shadow-lg border border-white/20 mb-4">
                        <Activity className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">AlbugiMed OS</h1>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1 text-center">
                        La plateforme de productivité et de révision pour l&apos;EDN.
                    </p>
                </div>

                {/* Main Card */}
                <div className="app-card overflow-hidden">
                    
                    {/* Tabs */}
                    <div className="flex border-b border-[var(--color-border)]">
                        <button 
                            type="button"
                            onClick={() => { setMode('login'); setErrorMsg(null); }}
                            className={cn(
                                "flex-1 text-sm font-semibold py-4 border-b-2 transition-colors",
                                mode === 'login' 
                                  ? "border-[var(--color-accent)] text-[var(--color-text-primary)]" 
                                  : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                            )}
                        >
                            Se connecter
                        </button>
                        <button 
                            type="button"
                            onClick={() => { setMode('signup'); setErrorMsg(null); }}
                            className={cn(
                                "flex-1 text-sm font-semibold py-4 border-b-2 transition-colors",
                                mode === 'signup' 
                                  ? "border-[var(--color-accent)] text-[var(--color-text-primary)]" 
                                  : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                            )}
                        >
                            Créer un compte
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
                        
                        {errorMsg && (
                            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[13px] font-medium leading-relaxed">
                                {errorMsg}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)] mb-2">
                                    Email de connexion
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-text-hint)]" />
                                    <input 
                                        type="email" 
                                        name="email"
                                        required
                                        autoComplete="email"
                                        placeholder="etudiant@medecine.fr"
                                        className="app-input w-full pl-11 h-12 text-sm transition-all focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)] mb-2">
                                    Mot de passe
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-text-hint)]" />
                                    <input 
                                        type="password" 
                                        name="password"
                                        required
                                        autoComplete={mode === 'login' ? "current-password" : "new-password"}
                                        placeholder="••••••••"
                                        minLength={6}
                                        className="app-input w-full pl-11 h-12 text-sm transition-all focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
                                    />
                                </div>
                                {mode === 'signup' && (
                                   <p className="text-[11px] text-[var(--color-text-hint)] mt-2 italic">
                                       Garde ça pour toi. (6 caractères minimum)
                                   </p>
                                )}
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isPending}
                            className="w-full h-12 app-btn-primary flex items-center justify-center gap-2 group text-sm disabled:opacity-70"
                        >
                            {isPending ? (
                                <div className="flex gap-1 items-center">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce" />
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce [animation-delay:-0.15s]" />
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce [animation-delay:-0.3s]" />
                                    <span className="ml-2 font-medium">Validation...</span>
                                </div>
                            ) : mode === 'login' ? (
                                <>
                                    <span>Accéder au dashboard</span>
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            ) : (
                                <>
                                    <span>Créer mon compte</span>
                                    <Check className="w-4 h-4 ml-1" />
                                </>
                            )}
                        </button>
                        
                    </form>
                </div>
                
                {mode === 'login' && (
                    <p className="text-center text-xs text-[var(--color-text-hint)] mt-6">
                       Si vous n&apos;avez pas de compte, basculez l&apos;onglet ci-dessus !
                    </p>
                )}
            </div>
        </div>
    );
}
