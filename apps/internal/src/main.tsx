import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToasterWrapper } from "@workspace/ui/components";
import { initializeSentryClient } from "@/lib/monitoring/sentry.client.config";
import { installGlobalErrorHandler } from "@/lib/monitoring/client-error-reporter";
import { installWebVitalsReporter } from "@/lib/monitoring/web-vitals";
import { ErrorBoundary } from "@workspace/ui/components/feedback/error-boundary";
import { DialogStackProvider } from "@workspace/ui/components/overlay/dialog-stack";
import { logger } from "@/lib/monitoring/logger";
import { AuthProvider } from "@/lib/auth/auth";
import "@workspace/ui/styles/globals.css";
import App from "./App";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

initializeSentryClient();
installGlobalErrorHandler();
installWebVitalsReporter();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <DialogStackProvider>
              <ErrorBoundary
                onError={(error, info) => {
                  logger.error("ErrorBoundary caught", { error, info });
                }}
              >
                <App />
              </ErrorBoundary>
              <ToasterWrapper />
            </DialogStackProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  </StrictMode>,
);
