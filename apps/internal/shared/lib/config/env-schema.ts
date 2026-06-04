// check-as-cast-density: allow-file — narrowing casts required by generic signatures or external types
import { z } from "zod";

const isServer = typeof window === "undefined";

export const InternalEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().min(1, "API URL is required"),
  NEXT_PUBLIC_APP_URL: z.string().min(1, "App URL is required"),
});

export type InternalEnv = z.infer<typeof InternalEnvSchema>;

let validatedEnv: InternalEnv | null = null;

export function getInternalEnv(): InternalEnv {
  if (validatedEnv) return validatedEnv;

  const raw: Record<string, string | undefined> = {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  };

  const result = InternalEnvSchema.safeParse(raw);

  if (!result.success) {
    if (isServer) {
      throw new Error(
        `Internal env validation failed:\n${result.error.errors
          .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
          .join("\n")}`,
      );
    }
    return {} as InternalEnv;
  }

  validatedEnv = result.data;
  return validatedEnv;
}
