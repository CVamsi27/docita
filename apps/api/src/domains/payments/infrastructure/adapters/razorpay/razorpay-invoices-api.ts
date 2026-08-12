import type Razorpay from 'razorpay';
import type invoices from 'razorpay/dist/types/invoices';

type RazorpayInvoicesApi = ReturnType<typeof invoices>;

export function getRazorpayInvoicesApi(client: Razorpay): RazorpayInvoicesApi {
  return client.invoices;
}
