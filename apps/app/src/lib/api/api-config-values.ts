const isCloudflareBuild = process.env["DOCITA_CLOUDFLARE"] === "1";
const defaultAppUrl = isCloudflareBuild
  ? "https://app.docita.work"
  : "http://localhost:3000";

export const getAppUrl = (): string =>
  process.env["VITE_APP_URL"] || defaultAppUrl;
