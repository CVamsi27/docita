"use client";

import { motion, useReducedMotion } from "motion/react";

import { cn } from "@workspace/ui/lib/utils";

import { landingSpringTransition } from "@/lib/motion-prefs";

interface HeroWorkflowVisualProps {
  className?: string;
}

const NODES = [
  { cx: 88, label: "QUEUE", sub: "tokens", inner: "fill-warning" },
  { cx: 176, label: "CHART", sub: "one file", inner: "fill-primary" },
  { cx: 264, label: "BILL", sub: "same visit", inner: "fill-success" },
  { cx: 352, label: "WA", sub: "follow-up", inner: "fill-info" },
] as const;

const BAR_SPECS = [
  { x: 40, w: 120, className: "fill-primary/40" },
  { x: 168, w: 88, className: "fill-info/35" },
  { x: 272, w: 128, className: "fill-success/40" },
] as const;

/**
 * Abstract OPD pipeline graphic — geometry + mono labels, theme-aware via CSS variables.
 * Connector path and nodes use Motion for a subtle “live diagram” entrance.
 */
export function HeroWorkflowVisual({ className }: HeroWorkflowVisualProps) {
  const reduce = useReducedMotion();
  const instant = reduce === true;
  const spring = landingSpringTransition(reduce ?? false);

  return (
    <svg
      className={cn("h-auto w-full min-w-0 max-w-full", className)}
      viewBox="0 0 440 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        x="18"
        y="36"
        width="404"
        height="208"
        rx="18"
        className="stroke-primary/45 fill-card/75"
        strokeWidth="1.5"
      />

      <motion.path
        d="M72 132 H368"
        className="stroke-muted-foreground/35"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="6 10"
        initial={instant ? { pathLength: 1 } : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={instant ? { duration: 0 } : { duration: 1.15, ease: "easeInOut" }}
      />

      {NODES.map((node, i) => {
        const nodeDelay = instant ? 0 : 0.35 + i * 0.09;
        return (
        <g key={node.label}>
          <motion.circle
            cx={node.cx}
            cy="132"
            r="26"
            className="fill-background stroke-primary/50"
            strokeWidth="2"
            initial={instant ? { scale: 1, opacity: 1 } : { scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={
              instant
                ? { duration: 0 }
                : { ...spring, delay: nodeDelay }
            }
            style={{ transformOrigin: `${node.cx}px 132px` }}
          />
          <motion.circle
            cx={node.cx}
            cy="132"
            r="10"
            className={node.inner}
            initial={instant ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={
              instant
                ? { duration: 0 }
                : { ...spring, delay: nodeDelay + 0.05 }
            }
            style={{ transformOrigin: `${node.cx}px 132px` }}
          />
          <text
            x={node.cx}
            y="196"
            textAnchor="middle"
            className="fill-foreground"
            style={{
              fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.14em",
            }}
          >
            {node.label}
          </text>
          <text
            x={node.cx}
            y="214"
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontSize: "10px",
              fontWeight: 500,
            }}
          >
            {node.sub}
          </text>
        </g>
        );
      })}

      <text
        x="40"
        y="64"
        className="fill-muted-foreground"
        style={{
          fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "0.2em",
        }}
      >
        LIVE WORKFLOW MAP
      </text>

      {BAR_SPECS.map((bar, i) => (
        <motion.rect
          key={`${bar.x}-${bar.w}`}
          x={bar.x}
          y="244"
          height="6"
          rx="3"
          className={bar.className}
          initial={instant ? { width: bar.w, opacity: 1 } : { width: 0, opacity: 0.55 }}
          animate={{ width: bar.w, opacity: 1 }}
          transition={
            instant
              ? { duration: 0 }
              : { ...spring, delay: 0.75 + i * 0.06 }
          }
        />
      ))}
    </svg>
  );
}
