"use client";

import dynamic from "next/dynamic";

const VISUAL_TEST_FIXTURES = {
  "doctor-workflow": dynamic(
    () => import("./DoctorWorkflowVisualTestPageContent"),
    { ssr: false },
  ),
  "origin-primitives": dynamic(
    () => import("./OriginPrimitivesVisualTestPageContent"),
    { ssr: false },
  ),
  "stats-card": dynamic(() => import("./StatsCardVisualTestPageContent"), {
    ssr: false,
  }),
  "status-badge": dynamic(() => import("./StatusBadgeVisualTestPageContent"), {
    ssr: false,
  }),
  "ui-contract": dynamic(() => import("./UiContractVisualTestPageContent"), {
    ssr: false,
  }),
} as const;

export function VisualTestFixturePageContent({
  fixture,
}: {
  fixture: keyof typeof VISUAL_TEST_FIXTURES;
}) {
  const Fixture = VISUAL_TEST_FIXTURES[fixture];
  return <Fixture />;
}
