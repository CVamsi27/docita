"use client";

import { usePathname } from "next/navigation";
import { createNavigationHistoryProvider } from "@workspace/hooks";

export const { readInAppNavCount, NavigationHistoryProvider } =
  createNavigationHistoryProvider(
    {
      countKey: "docita-internal:nav-count",
      entryKey: "docita-internal:nav-entry",
    },
    usePathname,
  );
