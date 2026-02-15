import { useCallback, useState } from "react";

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  image?: string;
  order_id: string;
  handler: (response: Record<string, unknown>) => void;
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
        alert("Razorpay SDK failed to load. Are you online?");
        return;
      }

      // @ts-expect-error Razorpay is added to window by the script
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response: { error: Record<string, unknown> }) {
         // handle failure if needed
         console.error(response.error);
      });
      rzp.open();
    },
    [loadRazorpay]
  );

  return { isLoaded, openCheckout };
}
