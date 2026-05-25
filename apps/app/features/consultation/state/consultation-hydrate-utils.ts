import { z } from "zod";

export function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value));
}

export function readStringField(
  data: Record<string, unknown>,
  key: string,
): string {
  const value = data[key];
  return typeof value === "string" ? value : "";
}

export function parseZodField<T>(schema: z.ZodType<T>, raw: unknown, fallback: T): T {
  const parsed = schema.safeParse(raw);
  return parsed.success ? parsed.data : fallback;
}
