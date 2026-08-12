import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { HelmetProvider } from "react-helmet-async";
import { ReactQueryProvider } from "@/providers/react-query-provider";
import { DataAccessBridge } from "@/providers/data-access-bridge";
import { AuthProvider } from "@/lib/auth/auth-context";
import { AppProviders } from "@/components/layout/providers";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { SocketProvider } from "@/lib/socket";
import { initializeSentryClient } from "@/lib/monitoring/sentry.client.config";
import { installGlobalErrorHandler } from "@/lib/monitoring/client-error-reporter";
import { installWebVitalsReporter } from "@/lib/monitoring/web-vitals";
import { ErrorBoundaryWrapper } from "@/components/errors/error-boundary";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { I18nProvider } from "@/i18n/provider";
import App from "./App";
import "@workspace/ui/styles/globals.css";

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
      <BrowserRouter>
        <ReactQueryProvider>
          <AuthProvider>
            <DataAccessBridge>
              <ThemeProvider>
                <I18nProvider>
                  <AppProviders>
                    <SocketProvider>
                      <ErrorBoundaryWrapper>
                        <App />
                      </ErrorBoundaryWrapper>
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