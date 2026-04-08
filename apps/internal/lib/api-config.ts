const DEFAULT_API_URL =
  process.env.DOCITA_CLOUDFLARE === "1"
    ? "https://api.docita.work/api/v1"
    : "http://127.0.0.1:3001/api/v1";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
