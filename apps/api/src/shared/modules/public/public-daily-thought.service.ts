import { Injectable, Logger } from '@nestjs/common';
import { dailyThoughtResponseSchema } from '@workspace/types';
import type { DailyThoughtResponse } from '@workspace/types';
import { z } from 'zod';
import { fetchWithTimeout } from '@/shared/common/http/fetch-with-timeout';

const ZENQUOTES_TODAY = 'https://zenquotes.io/api/today';
const ZENQUOTES_FETCH_TIMEOUT_MS = 2_000;

const zenQuotesTodaySchema = z.array(
  z.object({
    q: z.string(),
    a: z.string(),
  }),
);

const FALLBACK_DAILY_THOUGHT: DailyThoughtResponse = {
  quote: 'The best way to find out if you can trust somebody is to trust them.',
  author: 'Ernest Hemingway',
};

@Injectable()
export class PublicDailyThoughtService {
  private readonly logger = new Logger(PublicDailyThoughtService.name);
  private cachedDayKey: string | null = null;
  private cachedThought: DailyThoughtResponse | null = null;

  async getDailyThought(): Promise<DailyThoughtResponse> {
    const dayKey = new Date().toISOString().slice(0, 10);

    if (this.cachedDayKey === dayKey && this.cachedThought) {
      return this.cachedThought;
    }

    const thought = await this.fetchThoughtForDay();
    this.cachedDayKey = dayKey;
    this.cachedThought = thought;
    return thought;
  }

  private async fetchThoughtForDay(): Promise<DailyThoughtResponse> {
    try {
      const payload = await this.fetchZenQuotesToday();
      return dailyThoughtResponseSchema.parse(payload);
    } catch (error) {
      this.logger.warn(
        `Daily thought fallback: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return { ...FALLBACK_DAILY_THOUGHT };
    }
  }

  private async fetchZenQuotesToday(): Promise<DailyThoughtResponse> {
    const response = await fetchWithTimeout(
      ZENQUOTES_TODAY,
      { headers: { Accept: 'application/json' } },
      ZENQUOTES_FETCH_TIMEOUT_MS,
    );

    if (!response.ok) {
      throw new Error(`ZenQuotes responded with ${response.status}`);
    }

    const raw: unknown = await response.json();
    const parsed = zenQuotesTodaySchema.safeParse(raw);
    const first = parsed.success ? parsed.data[0] : undefined;

    if (!first?.q?.trim() || !first?.a?.trim()) {
      throw new Error('ZenQuotes payload missing quote or author');
    }

    return { quote: first.q.trim(), author: first.a.trim() };
  }
}
