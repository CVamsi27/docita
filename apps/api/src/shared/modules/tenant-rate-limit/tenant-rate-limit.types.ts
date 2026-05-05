export interface TenantQuota {
  rps: number;
  rpm: number;
  monthlyBudget: number;
  currentMonthUsed: number;
  currentMonthResetsAt: Date;
}

export interface QuotaUpsertInput {
  rps: number;
  rpm: number;
  monthlyBudget: number;
  notes?: string;
}

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  windowMs: number;
  reason?: 'burst' | 'sustained' | 'monthly';
}
