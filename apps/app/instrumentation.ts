export async function register() {
  if (
    process.env.DOCITA_CLOUDFLARE === "1" ||
    process.env.NEXT_RUNTIME !== "nodejs"
  ) {
    return;
  }

  try {
    await import("./sentry.server.config");
  } catch {
  }
}
