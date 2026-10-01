import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { HelmetProvider } from "react-helmet-async";
import { ReactQueryProvider } from "@/providers/react-query-provider";
import { DataAccessBridge } from "@/providers/data-access-bridge";
import { AuthProvider } from "@/lib/auth/auth-provider";
import { AppProviders } from "@/components/layout/providers";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { SocketProvider } from "@/lib/socket";
import { startApiAvailabilityCheck } from "@/lib/api/api-availability";
import { initializeSentryClient } from "@/lib/monitoring/sentry.client.config";
import { installGlobalErrorHandler } from "@/lib/monitoring/client-error-reporter";
import { installWebVitalsReporter } from "@/lib/monitoring/web-vitals";
import { ErrorBoundary } from "@workspace/ui/components/feedback/error-boundary";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { I18nProvider } from "@/i18n/provider";
import App from "./App";
import "@workspace/ui/styles/globals.css";

initializeSentryClient();
installGlobalErrorHandler();
installWebVitalsReporter();
// Before render: the availability check must be the app's first request, or the
// boot traffic it is meant to gate starves it (see startApiAvailabilityCheck).
startApiAvailabilityCheck();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <ReactQueryProvider>
          <AuthProvider>
            <DataAccessBridge>
              <ThemeProvider>
                <I18nProvider>
                  <AppProviders>
                    <SocketProvider>
                      <ErrorBoundary>
                        <App />
                      </ErrorBoundary>
                      <PwaRegister />
                    </SocketProvider>
                  </AppProviders>
                </I18nProvider>
              </ThemeProvider>
            </DataAccessBridge>
          </AuthProvider>
        </ReactQueryProvider>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
);