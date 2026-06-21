"use client";

import type { ElementRect } from "@/features/guided-tour/hooks/use-element-rect";

const PADDING = 8;
const RADIUS = 10;

/**
 * Full-screen dimmer with an optional rounded "hole" punched over the target
 * rect (SVG mask). With no rect it dims the whole viewport for a centered card.
 */
export function SpotlightMask({
  rect,
  reducedMotion,
}: {
  rect: ElementRect | null;
  reducedMotion: boolean;
}) {
  return (
    <svg
      className={
        "absolute inset-0 h-full w-full" +
        (reducedMotion ? "" : " transition-all duration-200")
      }
      aria-hidden="true"
    >
      <defs>
        <mask id="guided-tour-spotlight">
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          {rect ? (
            <rect
              x={rect.left - PADDING}
              y={rect.top - PADDING}
              width={rect.width + PADDING * 2}
              height={rect.height + PADDING * 2}
              rx={RADIUS}
              ry={RADIUS}
              fill="black"
            />
          ) : null}
        </mask>
      </defs>
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill="rgb(2 6 23 / 0.6)"
        mask="url(#guided-tour-spotlight)"
      />
    </svg>
  );
}
