import { useLocation } from "react-router";
import { createNavigationHistoryProvider } from "@workspace/hooks";

const usePathnameAdapter = () => useLocation().pathname;

export const { NavigationHistoryProvider } =
  createNavigationHistoryProvider(
    { countKey: "docita:nav-count", entryKey: "docita:nav-entry" },
    usePathnameAdapter,
  );