

export async function register() {

  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {

      await import("./lib/sentry.server.config");
    } catch (error) {

    }
  }
}
