import type Razorpay from 'razorpay';

/** Razorpay Node SDK invoice resource typings are incomplete; isolate the cast here. */
export interface RazorpayInvoicesApi {
  create: (body: Record<string, unknown>) => Promise<Record<string, unknown>>;
  all: (query: Record<string, unknown>) => Promise<{ items: unknown[] }>;
}

export function getRazorpayInvoicesApi(client: Razorpay): RazorpayInvoicesApi {
  return client.invoices as unknown as RazorpayInvoicesApi;
}
