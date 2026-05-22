import { proxyUpstreamApiRequest } from "@/lib/api/upstream-api-proxy";

export const dynamic = "force-dynamic";

async function proxyRequest(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyUpstreamApiRequest(request, path);
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
