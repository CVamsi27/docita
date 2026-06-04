import { useCallback, useRef, useState } from "react";
import { logger } from "@/lib/monitoring/logger";
import {
  clearStaleRazorpayGlobal,
  isRazorpayConstructibleFn,
  type RazorpayCheckoutResult,
  type RazorpayOptions,
  type RazorpayResponse,
  type RazorpayInstance,
} from "./razorpay-helpers";
import {
  type RazorpayCheckoutError,
  isPaymentCanceledError,
  notifyPaymentCanceled,
} from "./razorpay-checkout-errors";

export {
  isPaymentCanceledError,
  notifyPaymentCanceled,
  type RazorpayCheckoutError,
};

export type { RazorpayCheckoutResult, RazorpayResponse };

export function useRazorpay() {
  const [isLoaded, setIsLoaded] = useState(false);
  // Tracks the currently-open Razorpay instance so callers can dismiss it
  // programmatically (e.g. from a "Cancel checkout" button rendered in the app).
  const activeInstanceRef = useRef<RazorpayInstance | null>(null);
  const checkoutSettlementRef = useRef<
    ((result: RazorpayCheckoutResult) => void) | null
  >(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const settleCheckoutOnce = useCallback((result: RazorpayCheckoutResult) => {
    const settle = checkoutSettlementRef.current;
    if (!settle) {
      return;
    }
    checkoutSettlementRef.current = null;
    activeInstanceRef.current = null;
    setIsCheckoutOpen(false);
    if (result.status === "canceled") {
      notifyPaymentCanceled();
    }
    settle(result);
  }, []);

  const loadRazorpay = useCallback(() => {
    const existingPromise = globalThis.__docitaRazorpayLoadPromise;
    if (existingPromise) return existingPromise;

    const promise = new Promise<boolean>((resolve) => {
      if (typeof window === "undefined") {
        resolve(false);
        return;
      }

      if (isRazorpayConstructibleFn()) {
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
        const loaded = isRazorpayConstructibleFn();
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
  }, []);

  const openCheckout = useCallback(
    async (options: RazorpayOptions): Promise<RazorpayCheckoutResult> => {
      const loaded = await loadRazorpay();
      if (!loaded) {
        throw new Error(
          "We could not open payment right now. Please check your connection and try again.",
        );
      }

      return new Promise<RazorpayCheckoutResult>((resolve, reject) => {
        const RazorpayCtor = window.Razorpay;
        if (!RazorpayCtor) {
          reject(
            new Error(
              "We could not open payment right now. Please refresh and try again.",
            ),
          );
          return;
        }

        checkoutSettlementRef.current = resolve;

        const rzp = new RazorpayCtor({
          ...options,
          handler: async (response: RazorpayResponse) => {
            try {
              await options.handler(response);
              settleCheckoutOnce({ status: "completed" });
            } catch (error: unknown) {
              checkoutSettlementRef.current = null;
              activeInstanceRef.current = null;
              setIsCheckoutOpen(false);
              reject(error);
            }
          },
          modal: {
            ...options.modal,
            // Sensible defaults so the modal is easy to dismiss without
            // hunting for Razorpay's small built-in X.
            escape: options.modal?.escape ?? true,
            backdropclose: options.modal?.backdropclose ?? true,
            confirm_close: options.modal?.confirm_close ?? false,
            animation: options.modal?.animation ?? true,
            ondismiss: () => {
              options.modal?.ondismiss?.();
              settleCheckoutOnce({ status: "canceled" });
            },
          },
        });

        rzp.on?.("payment.failed", (...args: unknown[]) => {
          void args;
          settleCheckoutOnce({ status: "failed" });
        });

        activeInstanceRef.current = rzp;
        setIsCheckoutOpen(true);
        rzp.open();
      });
    },
    [loadRazorpay, settleCheckoutOnce],
  );

  /** Programmatically close the active Razorpay modal, if any. */
  const closeCheckout = useCallback(() => {
    const rzp = activeInstanceRef.current;
    settleCheckoutOnce({ status: "canceled" });
    if (!rzp) {
      return;
    }
    try {
      rzp.close();
    } catch {
      // Razorpay throws if already closed; ignore.
    }
  }, [settleCheckoutOnce]);

  return { isLoaded, openCheckout, closeCheckout, isCheckoutOpen };
}
