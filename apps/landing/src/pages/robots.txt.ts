import type { APIRoute } from "astro";
import { textResponse } from "@/lib/text-response";

const BASE_URL = "https://docita.work";

export const GET: APIRoute = () =>
  textResponse(
    `User-agent: *
Allow: /
Sitemap: ${BASE_URL}/sitemap.xml
`,
    "text/plain; charset=utf-8",
  );
