"use client";

import type { ReactNode } from "react";

import { cn } from "@workspace/ui/lib/utils";
import { LiveDot } from "@workspace/ui/components/indicators/live-dot";

export interface NowServingBoardProps {
  token?: string | null;
  patientName?: string | null;
  waiting?: number;
  avgWaitMinutes?: number | null;
  status?: "live" | "idle";
  eyebrow?: string;
  className?: string;
  footer?: ReactNode;
}

function formatWait(mins: number | null | undefined): string {
  if (mins == null || !Number.isFinite(mins) || mins <= 0) return "—";
  if (mins < 60) return `${Math.round(mins)} m`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m === 0 ? `${h} h` : `${h}h ${m}m`;
}

export function NowServingBoard({
  token,
  patientName,
  waiting = 0,
  avgWaitMinutes,
  status = "idle",
  eyebrow = "Now serving",
  className,
  footer,
}: NowServingBoardProps) {
  const isLive = status === "live" && Boolean(token);
  const displayToken = token && token.trim().length > 0 ? token : "—";

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-[var(--radius)] border border-white/5 px-5 py-4 text-white shadow-sm",
        className,
      )}
      style={{ background: "var(--brand-ink)" }}
    >
      <div
        className="flex items-center gap-2 text-[var(--fs-2xs)] font-medium uppercase tracking-[0.14em]"
        style={{ color: "rgba(255,255,255,0.55)", fontFamily: "var(--font-mono)" }}
      >
        {isLive ? <LiveDot tone="cyan" ariaLabel="Live" /> : null}
        <span>{eyebrow}</span>
      </div>

      <div
        className="font-semibold leading-none"
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "clamp(2.5rem, 6vw, 3.75rem)",
          color: isLive ? "var(--brand-cyan)" : "rgba(255,255,255,0.55)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {displayToken}
      </div>

      {patientName ? (
        <div
          className="truncate text-[var(--fs-sm)] font-medium"
          style={{ color: "rgba(255,255,255,0.85)" }}
        >
          {patientName}
        </div>
      ) : null}

      <div
        className="mt-1 flex items-center justify-between text-[var(--fs-xs)]"
        style={{ color: "rgba(255,255,255,0.7)" }}
      >
        <span>
          Waiting ·{" "}
          <strong className="text-white tabular-nums">{waiting}</strong>
        </span>
        <span>
          Avg wait ·{" "}
          <strong className="text-white tabular-nums">
            {formatWait(avgWaitMinutes)}
          </strong>
        </span>
      </div>

      {footer ? (
        <div className="mt-2 border-t border-white/10 pt-2">{footer}</div>
      ) : null}
    </div>
  );
}
