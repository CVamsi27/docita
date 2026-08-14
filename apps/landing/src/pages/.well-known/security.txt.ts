import type { APIRoute } from "astro";
import { SUPPORT_EMAIL } from "@workspace/types";
import { textResponse } from "@/lib/text-response";

const BASE_URL = "https://docita.work";

export const GET: APIRoute = () =>
  textResponse(
    `Contact: mailto:${SUPPORT_EMAIL}
Preferred-Languages: en
Canonical: ${BASE_URL}/.well-known/security.txt
Policy: ${BASE_URL}/privacy
Expires: 2027-05-12T00:00:00Z
`,
    "text/plain; charset=utf-8",
  );
