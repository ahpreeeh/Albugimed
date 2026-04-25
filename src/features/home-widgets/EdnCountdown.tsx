"use client";

import { useState } from "react";
import { Target } from "lucide-react";
import { useCloudValue } from "@/shared/hooks/useCloudValue";

const EDN_DATE_KEY = "med-pilot-edn-date";

export const EdnCountdown = () => {
    const { data: ednDate, save: saveCloud } = useCloudValue<string>(EDN_DATE_KEY, "");
    const [editing, setEditing] = useState(false);

    const save = (val: string) => {
        saveCloud(val);
        setEditing(false);
    };

    if (!ednDate && !editing) {
        return (
            <button onClick={() => setEditing(true)}
                className="text-[10px] text-[var(--color-accent)] hover:underline font-medium">
                + Configurer date EDN
            </button>
        );
    }

    if (editing) {
        return (
            <input type="date" value={ednDate} onChange={e => save(e.target.value)}
                onBlur={() => setEditing(false)} autoFocus
                className="app-input text-xs py-0.5 px-2" />
        );
    }

    const days = Math.ceil((new Date(ednDate).getTime() - Date.now()) / 86400000);
    if (days < 0) return null;

    return (
        <button onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--color-accent)] hover:underline cursor-pointer">
            <Target className="h-3 w-3" />
            J-{days} EDN
        </button>
    );
};
