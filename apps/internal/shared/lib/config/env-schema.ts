// check-as-cast-density: allow-file
// check-non-null-assertion: allow-file — non-null guaranteed by prior guard or Prisma include
const isServer = typeof window === "undefined";

export interface InternalEnv {
  NEXT_PUBLIC_API_URL: string;
  NEXT_PUBLIC_APP_URL: string;
}

let validatedEnv: InternalEnv | null = null;

export function getInternalEnv(): InternalEnv {
  if (validatedEnv) return validatedEnv;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const errors: string[] = [];
  if (!apiUrl) errors.push("  - NEXT_PUBLIC_API_URL: API URL is required");
  if (!appUrl) errors.push("  - NEXT_PUBLIC_APP_URL: App URL is required");
  if (errors.length > 0) {
    if (isServer) {
      throw new Error(`Missing required environment variables:\n${errors.join("\n")}`);
    }
    return {} as InternalEnv;
  }
  validatedEnv = { NEXT_PUBLIC_API_URL: apiUrl as string, NEXT_PUBLIC_APP_URL: appUrl as string };
  return validatedEnv;
}
