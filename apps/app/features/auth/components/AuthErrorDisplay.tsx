"use client";

export function AuthErrorDisplay({ error }: { error?: string | null }) {
  if (!error) return null;
  return (
    <p className="text-sm text-destructive text-center">{error}</p>
  );
}
