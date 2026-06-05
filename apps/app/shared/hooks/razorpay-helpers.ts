export type RazorpayCheckoutResult =
  | { status: "completed" }
  | { status: "canceled" }
  | { status: "failed" };

export interface RazorpayInstance {
  open(): void;
  close(): void;
  on?(event: string, handler: (...args: unknown[]) => void): void;
}

export interface RazorpayOptions {
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
    escape?: boolean;
    backdropclose?: boolean;
    confirm_close?: boolean;
    animation?: boolean;
  };
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  [key: string]: unknown;
}

declare global {
  interface Window {
    Razorpay?: {
      new (options: RazorpayOptions): RazorpayInstance;
    };
  }

  var __docitaRazorpayLoadPromise: Promise<boolean> | undefined;
}

export function clearStaleRazorpayGlobal(): void {
  if (!("Razorpay" in window)) {
    return;
  }

  try {
    Reflect.deleteProperty(window, "Razorpay");
  } catch {
    window.Razorpay = undefined;
  }
}

export function isRazorpayConstructibleFn(): boolean {
  const RazorpayCtor = window.Razorpay;
  if (typeof RazorpayCtor !== "function") return false;

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
}
