import { useRef, useState } from "react";
import { Button } from "@workspace/ui/components/form/button";
import { TooltipProvider } from "@workspace/ui/components/overlay/tooltip";
import { internalClinicListEntrySchema } from "@workspace/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test-utils";
import { EditClinicDialog } from "@/features/dashboard/components/edit-clinic-dialog";

const apiPatch = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/api-client", () => ({ apiPatch }));
const clinic = internalClinicListEntrySchema.parse({
  id: "alpha",
  name: "Alpha Clinic",
  email: "alpha@example.test",
  phone: "+919000000001",
  address: "Fixture address",
  tier: "STARTER",
  type: "GENERAL",
  active: true,
  subscriptionStatus: "ACTIVE",
  createdAt: "2026-10-11T00:00:00Z",
  _count: { users: 2, patients: 4 },
});
beforeEach(() => {
  apiPatch.mockReset();
});

describe("facility edit", () => {
  it("keeps entered values after a failed request and returns focus after cancel", async () => {
    apiPatch.mockRejectedValue(new Error("Fixture unavailable"));
    const handleUpdate = vi.fn();
    render(
      <TooltipProvider>
        <EditClinicDialog
          clinic={clinic}
          onClinicUpdated={handleUpdate}
          triggerVariant="text"
        />
      </TooltipProvider>,
    );
    const trigger = screen.getByRole("button", { name: "Edit facility" });
    trigger.focus();
    fireEvent.click(trigger);
    const name = screen.getByRole("textbox", { name: /facility name/i });
    fireEvent.change(name, { target: { value: "Revised facility" } });
    fireEvent.click(screen.getByRole("button", { name: "Update Facility" }));
    await waitFor(() => expect(apiPatch).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Update Facility" }),
      ).toBeEnabled(),
    );
    expect(name).toHaveValue("Revised facility");
    expect(handleUpdate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("initializes a reopened form from refreshed canonical values", async () => {
    const { rerender } = render(
      <TooltipProvider>
        <EditClinicDialog
          clinic={clinic}
          onClinicUpdated={vi.fn()}
          triggerVariant="text"
        />
      </TooltipProvider>,
    );
    rerender(
      <TooltipProvider>
        <EditClinicDialog
          clinic={{ ...clinic, name: "Updated on server" }}
          onClinicUpdated={vi.fn()}
          triggerVariant="text"
        />
      </TooltipProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit facility" }));
    expect(screen.getByRole("textbox", { name: /facility name/i })).toHaveValue(
      "Updated on server",
    );
  });
});

it("returns focus to Review when a successful save removes the edit trigger", async () => {
  apiPatch.mockResolvedValue({});
  function ReviewHarness() {
    const reviewRef = useRef<HTMLButtonElement | null>(null);
    const [selected, setSelected] = useState(true);
    return (
      <TooltipProvider>
        <Button ref={reviewRef}>Review facility</Button>
        {selected ? (
          <EditClinicDialog
            clinic={clinic}
            triggerVariant="text"
            returnFocusRef={reviewRef}
            onClinicUpdated={() => setSelected(false)}
          />
        ) : null}
      </TooltipProvider>
    );
  }
  render(<ReviewHarness />);
  fireEvent.click(screen.getByRole("button", { name: "Edit facility" }));
  fireEvent.click(screen.getByRole("button", { name: "Update Facility" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Review facility" }),
    ).toHaveFocus(),
  );
});
