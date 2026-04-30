"use client";

import "@workspace/ui/globals.css";

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="m-0 font-sans bg-background text-foreground">
        <div className="min-h-screen flex items-center justify-center px-6 bg-[var(--surface-1)]">
          <div className="max-w-xl w-full text-center">
            <div
              role="presentation"
              className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full bg-[color-mix(in_oklch,var(--destructive),transparent_88%)] text-2xl font-semibold text-[var(--destructive)]"
              aria-hidden="true"
            >
              !
            </div>
            <h1 className="m-0 mb-2 text-2xl font-bold tracking-normal">
              We could not load this page
            </h1>
            <p className="m-0 mb-6 text-base leading-relaxed text-muted-foreground">
              Please try again or return to the home page.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => reset()}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/";
                }}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-input bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Go to home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
