export {
  API_URL,
  getAppApiUrl,
  resolveAppApiUrl,
  shouldUseSameOriginAppProxy,
} from "./api-url-resolver";
export {
  API_ENDPOINTS,
  APP_CONFIG,
  APP_URLS,
  STORAGE_KEYS,
  getApiUrl,
  getAppUrl,
  getChangePasswordUrl,
  getContactInquiryUrl,
  getLoginUrl,
  getPrescriptionPdfUrl,
  getSocketUrl,
  getSubscriptionConfigUrl,
  getTierConfigUrl,
} from "./api-config-values";

// Namespace import instead of a second named-import clause: the named
// re-export above already enumerates every value this module re-exposes,
// so importing the same names again just to assemble `config` would repeat
// that list verbatim. Spreading the namespace keeps the default-export
// object in sync with the re-exports without a second list to drift.
import * as apiConfigValues from "./api-config-values";

const config = { ...apiConfigValues };

export default config;
