"use client";

import { useEffect } from "react";

const SW_PATH = "/sw.js";

export function PwaRegister() {
  useEffect(() => {
    if (process.env["NODE_ENV"] !== "production") {
      return;
    }

    if (!("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker
      .register(SW_PATH, { updateViaCache: "none" })
      .then((registration) => {
        void registration.update();
      })
      .catch(() => {});
  }, []);

  return null;
}
