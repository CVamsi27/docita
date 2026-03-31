import type { SVGProps } from "react";

export const DOCITA_ICON_VIEWBOX = "0 0 32 32";
export const DOCITA_ICON_CACHE_BUST = "20260401";

export const DOCITA_BRAND_COLORS = {
  ink: "#0f172a",
  accentBrand: "#2dd4bf",
  accentFlash: "#4ade80",
  white: "#ffffff",
} as const;

function DPlusNeonCross(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <defs>
        <linearGradient
          id="neon-grad-d"
          x1="20"
          y1="5"
          x2="40"
          y2="25"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={DOCITA_BRAND_COLORS.accentBrand} />
          <stop offset="1" stopColor={DOCITA_BRAND_COLORS.accentFlash} />
        </linearGradient>
        <filter id="neon-glow-d" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle
        cx="16"
        cy="24"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="4.5"
      />
      <path
        d="M25 5v28"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
      />

      <path
        d="M36 10 h-3 v3 h-3 v-3 h-3 v-3 h3 v-3 h3 v3 h3 z"
        fill="url(#neon-grad-d)"
        style={{ filter: "url(#neon-glow-d)" }}
      />
    </svg>
  );
}

export function DocitaBrandMark(props: SVGProps<SVGSVGElement>) {
  return <DPlusNeonCross {...props} />;
}

export function DocitaBrandGlyph(props: SVGProps<SVGSVGElement>) {
  return <DPlusNeonCross {...props} />;
}

export function DocitaBrandPattern(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 260 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <g transform="translate(24 20) scale(2.05)" opacity="0.1">
        <DPlusNeonCross width="32" height="32" />
      </g>
      <g transform="translate(146 42) scale(1.45)" opacity="0.08">
        <DPlusNeonCross width="32" height="32" />
      </g>
    </svg>
  );
}
