import type { Request } from 'express';
import { WebhookVerifierService } from '@/shared/modules/webhooks/webhook-verifier';

export type ZeptoMailWebhookRequest = Request & {
  rawBody?: Buffer;
  body?: unknown;
};

function headerString(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function resolveRawBody(req: ZeptoMailWebhookRequest): Buffer {
  if (req.rawBody && req.rawBody.length > 0) return req.rawBody;
  return Buffer.from(JSON.stringify(req.body ?? {}));
}

/**
 * ZeptoMail ingress verification (Authorization header or optional HMAC + replay dedupe).
 * Returns false when the secret is missing, credentials are invalid, or the payload was replayed.
 */
export async function verifyZeptoMailWebhookIngress(params: {
  req: ZeptoMailWebhookRequest;
  secret: string;
  verifier: WebhookVerifierService;
}): Promise<boolean> {
  if (!params.secret) return false;

  const rawBody = resolveRawBody(params.req);
  const signature = headerString(params.req, 'x-zoho-signature');
  if (signature) {
    const normalized = signature.trim().replace(/^sha256=/i, '');
    const verification = await params.verifier.verify({
      provider: 'zeptomail',
      rawBody,
      signature: normalized,
      secret: params.secret,
    });
    return verification.ok;
  }

  const sharedSecretHeader =
    headerString(params.req, 'authorization') ??
    headerString(params.req, 'x-webhook-secret');
  if (!sharedSecretHeader) return false;

  const verification = await params.verifier.verify({
    provider: 'zeptomail',
    rawBody,
    signature: sharedSecretHeader,
    secret: params.secret,
    authMode: 'shared-secret-header',
    sharedSecretHeader,
  });
  return verification.ok;
}
