import type Razorpay from 'razorpay';
import type invoices from 'razorpay/dist/types/invoices';

export type RazorpayInvoicesApi = ReturnType<typeof invoices>;

export function getRazorpayInvoicesApi(client: Razorpay): RazorpayInvoicesApi {
  return client.invoices;
}
