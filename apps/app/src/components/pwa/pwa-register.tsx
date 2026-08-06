import { useEffect } from "react";

const SW_PATH = "/sw.js";

/**
 * Registers the service worker in production builds only. The SPA shell
 * (index.html + hashed assets) is precached by `public/sw.js`; navigation
 * requests fall back to `offline.html` while offline.
 */
export function PwaRegister() {
  useEffect(() => {
    if (import.meta.env.PROD !== true) {
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
