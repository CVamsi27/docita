"use client";

import { usePathname } from "next/navigation";
import { createNavigationHistoryProvider } from "@workspace/hooks";

export const { readInAppNavCount, NavigationHistoryProvider } =
  createNavigationHistoryProvider(
    { countKey: "docita:nav-count", entryKey: "docita:nav-entry" },
    usePathname,
  );
