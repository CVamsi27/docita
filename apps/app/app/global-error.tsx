// LINT-EXEMPT: raw hex colors below are intentional — this file renders before
// the Next.js app shell (and thus before CSS variables / Tailwind are available),
// so inline style literals are the only safe option here.
// jscpd:ignore-start — apps/app and apps/internal each ship a global-error.tsx
// with the same Next.js-mandated function signature (default export,
// `{ error, reset }` props, `<html><body>...`). The body content
// differs (raw inline styles in apps/app because the design system
// isn't loaded yet; Tailwind classes in apps/internal because the
// user is authenticated and the design system is). The shared
// 13 lines below are framework boilerplate, not duplication.
"use client";

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body
        style={{
          margin: 0,
          background: "#f8fafc",
          color: "#0f172a",
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            alignItems: "center",
            background: "#f8fafc",
            boxSizing: "border-box",
            display: "flex",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "24px",
          }}
        >
          <div
            style={{ maxWidth: "576px", textAlign: "center", width: "100%" }}
          >
            <div
              role="presentation"
              aria-hidden="true"
              style={{
                alignItems: "center",
                background: "#fee2e2",
                borderRadius: "9999px",
                color: "#b91c1c",
                display: "grid",
                fontSize: "24px",
                fontWeight: 600,
                height: "64px",
                margin: "0 auto 24px",
                placeItems: "center",
                width: "64px",
              }}
            >
              !
            </div>
            <h1
              style={{
                fontSize: "24px",
                fontWeight: 700,
                letterSpacing: 0,
                lineHeight: 1.25,
                margin: "0 0 8px",
              }}
            >
              We could not load this page
            </h1>
            <p
              style={{
                color: "#64748b",
                fontSize: "16px",
                lineHeight: 1.625,
                margin: "0 0 24px",
              }}
            >
              Please try again or return to the home page.
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "12px",
                justifyContent: "center",
              }}
            >
              <button
                type="button"
                onClick={() => reset()}
                style={{
                  alignItems: "center",
                  background: "#0f172a",
                  border: 0,
                  borderRadius: "8px",
                  color: "#ffffff",
                  cursor: "pointer",
                  display: "inline-flex",
                  fontSize: "14px",
                  fontWeight: 600,
                  height: "40px",
                  justifyContent: "center",
                  padding: "0 20px",
                }}
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/";
                }}
                style={{
                  alignItems: "center",
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  color: "#0f172a",
                  cursor: "pointer",
                  display: "inline-flex",
                  fontSize: "14px",
                  fontWeight: 600,
                  height: "40px",
                  justifyContent: "center",
                  padding: "0 20px",
                }}
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
// jscpd:ignore-end
