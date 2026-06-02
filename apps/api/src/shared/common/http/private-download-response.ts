import type { Response } from 'express';

/** Prevent browsers and intermediaries from caching PHI-bearing responses. */
export function setPrivateNoStoreHeaders(
  response: Pick<Response, 'setHeader'>,
): void {
  response.setHeader('Cache-Control', 'private, no-store');
}
