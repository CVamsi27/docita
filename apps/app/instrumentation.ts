
export async function register() {
  if (
    process.env.DOCITA_CLOUDFLARE === "1" ||
    process.env.NEXT_RUNTIME !== "nodejs"
  ) {
    return;
  }

  try {
    await import("./lib/sentry.server.config");
  } catch (error) {
    // Ignore errors during instrumentation loading in non-NodeJS runtimes
    // or if the module is missing/stubbed.
  }
}
