import { useCallback, useState } from "react";

interface RazorpayInstance {
  open(): void;
  close(): void;
  on?(event: string, handler: (...args: unknown[]) => void): void;
}

declare global {
  interface Window {
    Razorpay: {
      new (options: RazorpayOptions): RazorpayInstance;
    };
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  image?: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void | Promise<void>;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;

  [key: string]: unknown;
}

export function useRazorpay() {
  const [isLoaded, setIsLoaded] = useState(false);

  const loadRazorpay = useCallback(() => {
    return new Promise((resolve) => {
      if (document.getElementById("razorpay-sdk")) {
        setIsLoaded(true);
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.id = "razorpay-sdk";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => {
        setIsLoaded(true);
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }, []);

  const openCheckout = useCallback(
    async (options: RazorpayOptions) => {
      const loaded = await loadRazorpay();
      if (!loaded) {
        throw new Error("Razorpay SDK failed to load. Are you online?");
      }

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          ...options,
          handler: async (response: RazorpayResponse) => {
            try {
              await options.handler(response);
              resolve();
            } catch (error: unknown) {
              reject(error);
            }
          },
          modal: {
            ...options.modal,
            ondismiss: () => {
              options.modal?.ondismiss?.();
              reject(new Error("Payment was cancelled"));
            },
          },
        });

        rzp.on?.(
          "payment.failed",
          (...args: unknown[]) => {
            const response = (args[0] || {}) as {
              error?: Record<string, unknown>;
            };
            const description = response.error?.description;
            const message =
              typeof description === "string" ? description : "Payment failed";
            reject(new Error(message));
          },
        );

        rzp.open();
      });
    },
    [loadRazorpay],
  );

  return { isLoaded, openCheckout };
}
