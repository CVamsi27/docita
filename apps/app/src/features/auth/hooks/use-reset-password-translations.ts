import { useTranslation } from "react-i18next";

/** Auth-namespace translation helper that falls back to the raw key when a
 *  `resetPassword.*` message is missing. */
export function useResetPasswordTranslations() {
  const { t } = useTranslation("Auth");
  return (key: string) => {
    const result = t(`resetPassword.${key}`);
    return result !== `resetPassword.${key}` ? result : key;
  };
}
