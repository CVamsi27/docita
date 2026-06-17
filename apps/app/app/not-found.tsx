import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ maxWidth: 480, textAlign: "center" }}>
        <h1 style={{ fontSize: 48, fontWeight: 700, margin: "0 0 8px" }}>404</h1>
        <p style={{ fontSize: 16, color: "#64748b", margin: "0 0 24px" }}>Sorry, we could not find the page you are looking for.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Link href="/today" style={{ padding: "0 20px", height: 40, borderRadius: 8, background: "#0f172a", color: "#fff", display: "inline-flex", alignItems: "center", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>Go to workspace</Link>
          <Link href="/login" style={{ padding: "0 20px", height: 40, borderRadius: 8, border: "1px solid #cbd5e1", color: "#0f172a", display: "inline-flex", alignItems: "center", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>Go back</Link>
        </div>
      </div>
    </div>
  );
}
