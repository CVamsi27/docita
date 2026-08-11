import { useContext } from "react";
import { AppConfigContext } from "./app-config-context-inner";

export function useOptionalAppConfig() {
  return useContext(AppConfigContext);
}
