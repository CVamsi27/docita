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
import {
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

const config = {
  getApiUrl,
  getAppUrl,
  getSocketUrl,
  getContactInquiryUrl,
  getLoginUrl,
  getSubscriptionConfigUrl,
  getTierConfigUrl,
  getChangePasswordUrl,
  getPrescriptionPdfUrl,
  API_ENDPOINTS,
  APP_URLS,
  STORAGE_KEYS,
  APP_CONFIG,
};

export default config;
