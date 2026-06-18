"use client";

import type { CSSProperties, ReactNode } from "react";

export interface NotFoundContentProps {
  /** Optional subtitle shown below the 404 heading. */
  subtitle?: string;
  /** Description paragraph below the heading. */
  description?: string;
  /** Primary and secondary action buttons rendered at the bottom. */
  children: ReactNode;
}

const DEFAULT_DESCRIPTION =
  "Sorry, we couldn\u2019t find the page you\u2019re looking for.";

/** Shared inline style for a primary (filled) action button rendered on the not-found page. */
export const notFoundPrimaryStyle: CSSProperties = {
  padding: "0 20px",
  height: 40,
  borderRadius: 8,
  background: "var(--color-foreground)",
  color: "var(--color-background)",
  display: "inline-flex",
  alignItems: "center",
  fontSize: 14,
  fontWeight: 600,
  textDecoration: "none",
  transition: "opacity 0.15s",
};

/** Shared inline style for a secondary (outlined) action button rendered on the not-found page. */
export const notFoundSecondaryStyle: CSSProperties = {
  padding: "0 20px",
  height: 40,
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  color: "var(--color-foreground)",
  display: "inline-flex",
  alignItems: "center",
  fontSize: 14,
  fontWeight: 600,
  textDecoration: "none",
  transition: "opacity 0.15s",
};

export function NotFoundContent({
  subtitle,
  description = DEFAULT_DESCRIPTION,
  children,
}: NotFoundContentProps) {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div style={{ maxWidth: 480, textAlign: "center", width: "100%" }}>
        <div
          role="presentation"
          aria-hidden="true"
          style={{
            alignItems: "center",
            background: "#f1f5f9",
            borderRadius: "9999px",
            color: "#64748b",
            display: "grid",
            fontSize: "24px",
            fontWeight: 600,
            height: "64px",
            margin: "0 auto 24px",
            placeItems: "center",
            width: "64px",
          }}
        >
          ?
        </div>
        <h1
          style={{
            fontSize: "48px",
            fontWeight: 700,
            letterSpacing: 0,
            lineHeight: 1.25,
            margin: "0 0 8px",
          }}
        >
          404
        </h1>
        {subtitle ? (
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 600,
              margin: "0 0 8px",
            }}
          >
            {subtitle}
          </h2>
        ) : null}
        <p
          style={{
            color: "#64748b",
            fontSize: "16px",
            lineHeight: 1.625,
            margin: "0 0 24px",
          }}
        >
          {description}
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            justifyContent: "center",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
