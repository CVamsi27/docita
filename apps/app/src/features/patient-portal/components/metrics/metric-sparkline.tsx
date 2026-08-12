"use client";

interface DataPoint {
  recordedAt: string;
  value: number;
}

interface MetricSparklineProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  color?: string;
}

export function MetricSparkline({
  data,
  width = 100,
  height = 32,
  color = "currentColor",
}: MetricSparklineProps) {
  if (data.length < 2) {
    return (
      <div
        style={{ width, height }}
        className="flex items-center justify-center text-xs text-muted-foreground"
      >
        Not enough data
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const padding = 2;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * innerWidth;
    const y = padding + (1 - (d.value - min) / range) * innerHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const polyline = points.join(" ");
  const lastPoint = points[points.length - 1]?.split(",") ?? ["0", "0"];

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
      />
      <circle
        cx={lastPoint[0]}
        cy={lastPoint[1]}
        r="2.5"
        fill={color}
        className="text-primary"
      />
    </svg>
  );
}
