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

export interface RazorpayCheckoutError extends Error {
  paymentCanceled?: boolean;
}

function createPaymentCanceledError(): RazorpayCheckoutError {
  const error = new Error(
    "Payment was canceled. No charge was made.",
  ) as RazorpayCheckoutError;
  error.paymentCanceled = true;
  return error;
}

function createPaymentFailedError(): RazorpayCheckoutError {
  return new Error(
    "We could not complete this payment. Please try again.",
  ) as RazorpayCheckoutError;
}

export function isPaymentCanceledError(
  error: unknown,
): error is RazorpayCheckoutError {
  return Boolean(
    error &&
      typeof error === "object" &&
      "paymentCanceled" in error &&
      (error as RazorpayCheckoutError).paymentCanceled,
  );
}

export function useRazorpay() {
  const [isLoaded, setIsLoaded] = useState(false);

  const loadRazorpay = useCallback(() => {
    return new Promise<boolean>((resolve) => {
      if (typeof window.Razorpay === "function") {
        setIsLoaded(true);
        resolve(true);
        return;
      }

      const existingScript = document.getElementById("razorpay-sdk");
      if (existingScript) {
        existingScript.remove();
      }

      const script = document.createElement("script");
      script.id = "razorpay-sdk";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => {
        const loaded = typeof window.Razorpay === "function";
        setIsLoaded(loaded);
        resolve(loaded);
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
        throw new Error(
          "We could not open payment right now. Please check your connection and try again.",
        );
      }

      await new Promise<void>((resolve, reject) => {
        if (typeof window.Razorpay !== "function") {
          reject(
            new Error(
              "We could not open payment right now. Please refresh and try again.",
            ),
          );
          return;
        }

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
              reject(createPaymentCanceledError());
            },
          },
        });

        rzp.on?.(
          "payment.failed",
          (...args: unknown[]) => {
            void args;
            reject(createPaymentFailedError());
          },
        );

        rzp.open();
      });
    },
    [loadRazorpay],
  );

  return { isLoaded, openCheckout };
}
