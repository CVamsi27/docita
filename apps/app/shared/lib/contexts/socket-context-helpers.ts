import { isRecord } from "@workspace/utils";

/**
 * Resolves the realtime socket endpoint — explicit env override first, then
 * the Cloudflare-vs-local default. Pulled out of `useSocketLifecycle` so the
 * lifecycle hook's connection effect isn't carrying environment-resolution
 * concerns alongside its socket wiring.
 */
export function resolveSocketUrl(): string {
  return (
    process.env["NEXT_PUBLIC_SOCKET_URL"] ||
    (process.env["DOCITA_CLOUDFLARE"] === "1"
      ? "https://api.docita.work"
      : "http://localhost:3001")
  );
}

export function socketErrorData(
  err: unknown,
): { content?: { message?: string } } | undefined {
  if (!isRecord(err) || !isRecord(err.data)) return undefined;
  const data = err.data;
  if (!isRecord(data.content)) return { content: undefined };
  const content = data.content;
  return {
    content: {
      message:
        typeof content.message === "string" ? content.message : undefined,
    },
  };
}
