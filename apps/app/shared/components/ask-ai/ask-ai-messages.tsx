"use client";

import { MicroLabel } from "@workspace/ui/components/micro-label";
import { cn } from "@workspace/ui/lib/utils";
import type { AskAiStoredMessage, AskAiStoredThread } from "./ask-ai-threads";

export function MessageBubble({ message }: { message: AskAiStoredMessage }) {
  return (
    <li
      className={cn(
        "max-w-[min(100%,28rem)] whitespace-pre-wrap text-[var(--fs-sm)] leading-relaxed",
        message.author === "user"
          ? "self-end rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-primary-foreground shadow-sm"
          : "self-start rounded-2xl rounded-bl-md border border-border/60 bg-muted/40 px-3.5 py-2.5 text-foreground",
      )}
    >
      {message.content}
    </li>
  );
}

interface ThreadGroupProps {
  label: string;
  threads: AskAiStoredThread[];
  activeId: string | null;
  onSelect: (id: string) => void;
  emptyHint?: string;
}

export function ThreadGroup({
  label,
  threads,
  activeId,
  onSelect,
  emptyHint,
}: ThreadGroupProps) {
  return (
    <div className="flex flex-col gap-1">
      <MicroLabel as="h2">{label}</MicroLabel>
      {threads.length === 0 ? (
        emptyHint ? (
          <p className="ui-section-subtitle mt-1 text-pretty text-left leading-snug">
            {emptyHint}
          </p>
        ) : null
      ) : (
        <ul className="flex flex-col gap-0.5">
          {threads.map((thread) => {
            const isActive = thread.id === activeId;
            return (
              <li key={thread.id}>
                <button
                  type="button"
                  onClick={() => onSelect(thread.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "w-full truncate rounded-md px-2 py-1.5 text-left text-[var(--fs-xs)] leading-snug transition-colors",
                    isActive
                      ? "bg-accent/15 text-foreground"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                  )}
                  title={thread.title}
                >
                  {thread.title}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
