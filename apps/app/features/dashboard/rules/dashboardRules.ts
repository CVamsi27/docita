

export const calculateGrowthRate = (
  current: number,
  previous: number,
): number => {
  if (previous === 0) return 100;
  return ((current - previous) / previous) * 100;
};

export const formatPercentage = (value: number): string => {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
};

export const getTrendDirection = (
  current: number,
  previous: number,
): "up" | "down" | "stable" => {
  const diff = current - previous;
  if (Math.abs(diff) < 0.01) return "stable";
  return diff > 0 ? "up" : "down";
};
