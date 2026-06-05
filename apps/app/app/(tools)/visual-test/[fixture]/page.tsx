import { notFound } from "next/navigation";
import { VisualTestFixturePageContent } from "@/features/dev-tools/components/VisualTestFixturePageContent";

const VISUAL_TEST_FIXTURES = [
  "doctor-workflow",
  "origin-primitives",
  "stats-card",
  "status-badge",
  "ui-contract",
] as const;

type VisualTestFixture = (typeof VISUAL_TEST_FIXTURES)[number];

function isVisualTestFixture(fixture: string): fixture is VisualTestFixture {
  return VISUAL_TEST_FIXTURES.some((candidate) => candidate === fixture);
}

export default async function VisualTestFixturePage({
  params,
}: {
  params: Promise<{ fixture: string }>;
}) {
  const { fixture } = await params;

  if (!isVisualTestFixture(fixture)) {
    notFound();
  }

  return <VisualTestFixturePageContent fixture={fixture} />;
}
