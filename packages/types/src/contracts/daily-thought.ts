import { z } from "zod";

export const dailyThoughtResponseSchema = z.object({
  quote: z.string(),
  author: z.string(),
});

export type DailyThoughtResponse = z.infer<typeof dailyThoughtResponseSchema>;
