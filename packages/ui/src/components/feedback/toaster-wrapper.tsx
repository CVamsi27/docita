import { Toaster } from "sonner";

/**
 * Shared Toaster configuration for all apps.
 * Use this instead of mounting sonner's Toaster directly.
 *
 * Config: richColors, top-right, 4s auto-dismiss, rounded-xl border.
 */
export function ToasterWrapper() {
  return (
    <Toaster
      richColors
      position="top-right"
      duration={4000}
      toastOptions={{
        classNames: {
          toast: "rounded-xl border shadow-lg",
          description: "text-sm",
        },
      }}
    />
  );
}
