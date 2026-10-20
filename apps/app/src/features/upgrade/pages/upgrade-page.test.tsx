import { Route, Routes, useLocation } from "react-router";
import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils";
import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription/subscription-settings-path";
import { UpgradePage } from "./upgrade-page";

function BillingDestination() {
  const location = useLocation();
  return <p>{location.pathname + location.search}</p>;
}

describe("Upgrade route", () => {
  it("opens the existing subscription workflow", async () => {
    render(
      <Routes>
        <Route path="/upgrade" element={<UpgradePage />} />
        <Route path="/settings" element={<BillingDestination />} />
      </Routes>,
      { initialEntries: ["/upgrade"] },
    );
    expect(
      await screen.findByText(SUBSCRIPTION_SETTINGS_PATH),
    ).toBeInTheDocument();
  });
});
