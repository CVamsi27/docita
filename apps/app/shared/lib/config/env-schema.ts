// check-as-cast-density: allow-file — narrowing casts required by generic signatures or external types
import { z } from "zod";

const isServer = typeof window === "undefined";

export const FrontendEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().min(1, "API URL is required"),
  NEXT_PUBLIC_APP_URL: z.string().min(1, "App URL is required"),
  NEXT_PUBLIC_SOCKET_URL: z.string().min(1, "Socket URL is required"),
  NEXT_PUBLIC_ANALYTICS_URL: z.string().optional(),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
});

export type FrontendEnv = z.infer<typeof FrontendEnvSchema>;

let validatedEnv: FrontendEnv | null = null;

export function getFrontendEnv(): FrontendEnv {
  if (validatedEnv) return validatedEnv;

  const raw: Record<string, string | undefined> = {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
    NEXT_PUBLIC_ANALYTICS_URL: process.env.NEXT_PUBLIC_ANALYTICS_URL,
    NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  };

  const result = FrontendEnvSchema.safeParse(raw);

  if (!result.success) {
    if (isServer) {
      throw new Error(
        `Frontend env validation failed:\n${result.error.errors
          .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
          .join("\n")}`,
      );
    }
    return {} as FrontendEnv;
  }

  validatedEnv = result.data;
  return validatedEnv;
}
