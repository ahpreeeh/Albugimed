"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ChevronRight } from "lucide-react";
import type { ErrorEntry } from "@/types";

export const RecentErrors = () => {
    const router = useRouter();
    const [errors, setErrors] = useState<ErrorEntry[]>([]);

    useEffect(() => {
        try {
            const raw = JSON.parse(localStorage.getItem("med-pilot-error-bank") || "[]");
            setErrors(Array.isArray(raw) ? raw.slice(0, 5) : []);
        } catch { setErrors([]); }
    }, []);

    if (errors.length === 0) return null;

    return (
        <div className="app-card p-3">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                    <span className="text-xs font-semibold text-[var(--color-text-primary)]">Dernières erreurs</span>
                </div>
                <button onClick={() => router.push("/simulation")}
                    className="text-[9px] text-[var(--color-accent)] hover:underline font-medium flex items-center gap-0.5">
                    Voir tout <ChevronRight className="h-2.5 w-2.5" />
                </button>
            </div>
            <div className="space-y-1.5">
                {errors.map(err => (
                    <div key={err.id} className="flex items-start gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[11px] font-medium text-[var(--color-text-primary)] truncate">{err.question}</p>
                            <p className="text-[9px] text-[var(--color-text-muted)]">{err.matiere}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
