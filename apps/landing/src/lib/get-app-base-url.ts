export function getAppBaseUrl(): string {
  const configuredUrl =
    import.meta.env["PUBLIC_APP_URL"] ||
    import.meta.env["NEXT_PUBLIC_APP_URL"] ||
    import.meta.env["APP_URL"];

  if (configuredUrl) return configuredUrl.replace(/\/+$/, "");

  return "http://localhost:3000";
}
