import { useCallback, useState } from "react";
import { logger } from "@/lib/logger";

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

  var __docitaRazorpayLoadPromise: Promise<boolean> | undefined;
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

  const isRazorpayConstructible = useCallback((): boolean => {
    const RazorpayCtor = window.Razorpay as unknown;
    if (typeof RazorpayCtor !== "function") return false;

    // Some environments can end up with a non-constructible function assigned to window.Razorpay.
    // We do a minimal construct attempt without calling open().
    try {
      const InstanceCtor = RazorpayCtor as unknown as new (
        options: RazorpayOptions,
      ) => RazorpayInstance;
      const instance = new InstanceCtor({
        key: "dummy",
        amount: 0,
        currency: "INR",
        name: "Docita",
        order_id: "dummy",
        handler: () => {},
      });
      return Boolean(instance && typeof instance.open === "function");
    } catch {
      return false;
    }
  }, []);

  const loadRazorpay = useCallback(() => {
    const existingPromise = globalThis.__docitaRazorpayLoadPromise;
    if (existingPromise) return existingPromise;

    const promise = new Promise<boolean>((resolve) => {
      if (typeof window === "undefined") {
        resolve(false);
        return;
      }

      if (isRazorpayConstructible()) {
        setIsLoaded(true);
        resolve(true);
        return;
      }

      const existingScript = document.getElementById("razorpay-sdk");
      if (existingScript) {
        existingScript.remove();
      }

      // Remove any stale global to force the new script to re-attach it.
      if ("Razorpay" in window) {
        try {
          delete (window as unknown as Record<string, unknown>).Razorpay;
        } catch {
          // Ignore if deletion is blocked.
          (window as unknown as Record<string, unknown>).Razorpay = undefined;
        }
      }

      const script = document.createElement("script");
      script.id = "razorpay-sdk";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => {
        const loaded = isRazorpayConstructible();
        if (!loaded) {
          logger.warn("Razorpay SDK loaded but constructor unavailable", {
            razorpayType: typeof window.Razorpay,
          });
        }
        setIsLoaded(loaded);
        resolve(loaded);
      };
      script.onerror = () => {
        logger.warn("Failed to load Razorpay SDK script");
        resolve(false);
      };
      document.body.appendChild(script);
    });
    globalThis.__docitaRazorpayLoadPromise = promise.finally(() => {
      globalThis.__docitaRazorpayLoadPromise = undefined;
    });

    return promise;
  }, [isRazorpayConstructible]);

  const openCheckout = useCallback(
    async (options: RazorpayOptions) => {
      const loaded = await loadRazorpay();
      if (!loaded) {
        throw new Error(
          "We could not open payment right now. Please check your connection and try again.",
        );
      }

      await new Promise<void>((resolve, reject) => {
        if (!isRazorpayConstructible()) {
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
    [isRazorpayConstructible, loadRazorpay],
  );

  return { isLoaded, openCheckout };
}
