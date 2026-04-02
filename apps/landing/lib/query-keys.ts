export const landingQueryKeys = {
  pricing: {
    config: (currency: string) => ["landing", "pricing", "config", currency] as const,
  },
  stats: {
    platform: () => ["landing", "stats", "platform"] as const,
  },
  contact: {
    inquiry: () => ["landing", "contact", "inquiry"] as const,
  },
} as const;

