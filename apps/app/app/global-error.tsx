"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
            color: "#0f172a",
          }}
        >
          <div style={{ maxWidth: 560, textAlign: "center" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 9999,
                margin: "0 auto 24px",
                background: "rgba(239, 68, 68, 0.12)",
                display: "grid",
                placeItems: "center",
                fontSize: 28,
              }}
            >
              !
            </div>
            <h1 style={{ fontSize: 28, margin: "0 0 8px", fontWeight: 700 }}>
              Something went wrong
            </h1>
            <p style={{ margin: "0 0 24px", color: "#475569", lineHeight: 1.6 }}>
              We encountered an unexpected error. Please try again or return to
              the home page.
            </p>
            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => reset()}
                style={{
                  border: 0,
                  borderRadius: 12,
                  padding: "12px 18px",
                  background: "#0f172a",
                  color: "white",
                  fontWeight: 600,
                  cursor: "pointer",
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
                  border: "1px solid #cbd5e1",
                  borderRadius: 12,
                  padding: "12px 18px",
                  background: "white",
                  color: "#0f172a",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Go to home
              </button>
            </div>
            {error.digest ? (
              <p style={{ marginTop: 16, fontSize: 12, color: "#64748b" }}>
                Error ID: {error.digest}
              </p>
            ) : null}
          </div>
        </div>
      </body>
    </html>
  );
}
