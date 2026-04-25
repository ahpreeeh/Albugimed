"use client";

import { AlertTriangle, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage } from '@/entities/simulation/types';
import { cn } from '@/shared/lib/cn';

interface ChatMessageBubbleProps {
    message: ChatMessage;
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
    return (
        <div className={cn(
            "flex gap-3 mb-5",
            message.role === 'user' ? "ml-auto flex-row-reverse max-w-[85%]" : "max-w-full"
        )}>
            <div className={cn(
                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                message.role === 'user' ? "border-[var(--color-accent-border)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]" :
                message.role === 'system' ? "border-amber-400/30 bg-amber-400/10 text-amber-400" :
                "border-[var(--color-border-default)] bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]"
            )}>
                {message.role === 'user' ? <User className="w-3.5 h-3.5" /> :
                 message.role === 'system' ? <AlertTriangle className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>
            <div className={cn(
                "rounded-2xl border px-4 py-3 text-sm leading-relaxed",
                message.role === 'user'
                    ? "rounded-tr-md border-[var(--color-accent-border)] bg-[var(--color-accent-soft)] text-[var(--color-text-primary)]"
                    : message.role === 'system'
                    ? "border-amber-400/30 bg-amber-400/10"
                    : "rounded-tl-md border-[var(--color-border-default)] bg-[var(--color-bg-card)] text-[var(--color-text-primary)]"
            )}>
                {message.role === 'model' ? (
                    <ReactMarkdown components={{
                        strong: ({ ...props }) => <span className="font-semibold text-[var(--color-accent)]" {...props} />,
                        ul: ({ ...props }) => <ul className="list-disc list-inside my-2 space-y-1" {...props} />,
                        ol: ({ ...props }) => <ol className="list-decimal list-inside my-2 space-y-1" {...props} />,
                        p: ({ ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                        h2: ({ ...props }) => <h2 className="text-base font-bold mt-4 mb-2 text-[var(--color-text-primary)]" {...props} />,
                        h3: ({ ...props }) => <h3 className="text-sm font-bold mt-3 mb-1.5 text-[var(--color-text-primary)]" {...props} />,
                    }}>
                        {message.text}
                    </ReactMarkdown>
                ) : <span className="text-[var(--color-text-primary)]">{message.text}</span>}
            </div>
        </div>
    );
}
