// jscpd:ignore-start — inline styles necessarily mirror shape of
// packages/ui NotFoundContent; both render a 404 shell with
// primary/secondary buttons and a centered layout.
import Link from "next/link";

const primaryStyle: React.CSSProperties = {
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
  textDecoration: "none",
};

const secondaryStyle: React.CSSProperties = {
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
  textDecoration: "none",
};

export default function NotFound() {
  return (
    <main
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
        style={{
          maxWidth: "576px",
          textAlign: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            color: "#64748b",
            fontSize: "96px",
            fontWeight: 800,
            lineHeight: 1,
            marginBottom: "8px",
          }}
        >
          404
        </div>
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 700,
            letterSpacing: 0,
            lineHeight: 1.25,
            margin: "0 0 8px",
            color: "#0f172a",
          }}
        >
          Page not found
        </h1>
        <p
          style={{
            color: "#64748b",
            fontSize: "16px",
            lineHeight: 1.625,
            margin: "0 0 24px",
          }}
        >
          The page you are looking for does not exist or has been moved.
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            justifyContent: "center",
          }}
        >
          <Link href="/today" style={primaryStyle}>
            Go to workspace
          </Link>
          <Link href="/login" style={secondaryStyle}>
            Go back
          </Link>
        </div>
      </div>
    </main>
  );
}
// jscpd:ignore-end
