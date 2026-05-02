import * as React from "react";
import { cn } from "../lib/utils";

export interface ProgressGaugeProps {
  /** 0..1 progress fraction. Values outside the range are clamped. */
  value: number;
  /** Inner content (typically a value + helper line). */
  label?: React.ReactNode;
  size?: number;
  strokeWidth?: number;
  ariaLabel?: string;
  ariaValueText?: string;
  className?: string;
  /** CSS color token. Defaults to `var(--success)`. */
  color?: string;
}

/**
 * Origin-style semicircle gauge for budget/inventory/utilization surfaces.
 * Pure SVG, no animation — respects motion policy.
 */
export function ProgressGauge({
  value,
  label,
  size = 160,
  strokeWidth = 16,
  ariaLabel = "Progress",
  ariaValueText,
  className,
  color = "var(--success)",
}: ProgressGaugeProps) {
  const fraction = Math.max(0, Math.min(1, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius;
  const dashOffset = circumference * (1 - fraction);

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(fraction * 100)}
      aria-valuetext={ariaValueText}
      className={cn("relative inline-flex flex-col items-center", className)}
      style={{ width: size, height: size / 2 + strokeWidth }}
    >
      <svg
        width={size}
        height={size / 2 + strokeWidth}
        viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`}
        aria-hidden
      >
        <path
          d={`M ${strokeWidth / 2} ${size / 2 + strokeWidth / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2 + strokeWidth / 2}`}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <path
          d={`M ${strokeWidth / 2} ${size / 2 + strokeWidth / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2 + strokeWidth / 2}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      {label ? (
        <div
          className="absolute inset-x-0 bottom-1 flex flex-col items-center text-center"
          aria-hidden
        >
          {label}
        </div>
      ) : null}
    </div>
  );
}
