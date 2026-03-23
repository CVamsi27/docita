
export async function register() {
  if (process.env.DOCITA_CLOUDFLARE === "1") {
    return;
  }

  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      await import("./lib/sentry.server.config");
    } catch {
    }
  }
}
