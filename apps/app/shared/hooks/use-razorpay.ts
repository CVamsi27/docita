import { useCallback, useRef, useState } from "react";
import { logger } from "@/lib/monitoring/logger";
import {
  PaymentCanceledError,
  PaymentFailedError,
  type RazorpayCheckoutError,
  isPaymentCanceledError,
} from "./razorpay-checkout-errors";

export { isPaymentCanceledError, type RazorpayCheckoutError };

interface RazorpayInstance {
  open(): void;
  close(): void;
  on?(event: string, handler: (...args: unknown[]) => void): void;
}

declare global {
  interface Window {
    Razorpay?: {
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
    /** Show a built-in close (X) on the modal (Razorpay default: true). */
    escape?: boolean;
    /** Allow clicking outside to dismiss (Razorpay default: false). */
    backdropclose?: boolean;
    /** Ask the user before closing (Razorpay default: false). */
    confirm_close?: boolean;
    /** Razorpay modal animation. */
    animation?: boolean;
  };
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;

  [key: string]: unknown;
}

function clearStaleRazorpayGlobal(): void {
  if (!("Razorpay" in window)) {
    return;
  }

  try {
    Reflect.deleteProperty(window, "Razorpay");
  } catch {
    window.Razorpay = undefined;
  }
}

export function useRazorpay() {
  const [isLoaded, setIsLoaded] = useState(false);
  // Tracks the currently-open Razorpay instance so callers can dismiss it
  // programmatically (e.g. from a "Cancel checkout" button rendered in the app).
  const activeInstanceRef = useRef<RazorpayInstance | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const isRazorpayConstructible = useCallback((): boolean => {
    const RazorpayCtor = window.Razorpay;
    if (typeof RazorpayCtor !== "function") return false;

    // Some environments can end up with a non-constructible function assigned to window.Razorpay.
    // We do a minimal construct attempt without calling open().
    try {
      const instance = new RazorpayCtor({
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

      clearStaleRazorpayGlobal();

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
        const RazorpayCtor = window.Razorpay;
        if (!RazorpayCtor) {
          reject(
            new Error(
              "We could not open payment right now. Please refresh and try again.",
            ),
          );
          return;
        }

        const rzp = new RazorpayCtor({
          ...options,
          handler: async (response: RazorpayResponse) => {
            try {
              await options.handler(response);
              activeInstanceRef.current = null;
              setIsCheckoutOpen(false);
              resolve();
            } catch (error: unknown) {
              activeInstanceRef.current = null;
              setIsCheckoutOpen(false);
              reject(error);
            }
          },
          modal: {
            // Sensible defaults so the modal is easy to dismiss without
            // hunting for Razorpay's small built-in X.
            escape: true,
            backdropclose: true,
            confirm_close: false,
            animation: true,
            ...options.modal,
            ondismiss: () => {
              options.modal?.ondismiss?.();
              activeInstanceRef.current = null;
              setIsCheckoutOpen(false);
              reject(new PaymentCanceledError());
            },
          },
        });

        rzp.on?.(
          "payment.failed",
          (...args: unknown[]) => {
            void args;
            activeInstanceRef.current = null;
            setIsCheckoutOpen(false);
            reject(new PaymentFailedError());
          },
        );

        activeInstanceRef.current = rzp;
        setIsCheckoutOpen(true);
        rzp.open();
      });
    },
    [isRazorpayConstructible, loadRazorpay],
  );

  /** Programmatically close the active Razorpay modal, if any. */
  const closeCheckout = useCallback(() => {
    const rzp = activeInstanceRef.current;
    if (!rzp) return;
    try {
      rzp.close();
    } catch {
      // Razorpay throws if already closed; ignore.
    }
    activeInstanceRef.current = null;
    setIsCheckoutOpen(false);
  }, []);

  return { isLoaded, openCheckout, closeCheckout, isCheckoutOpen };
}
