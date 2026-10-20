import { describe, expect, it, vi } from "vitest";
import type { ClinicalInvestigation } from "@workspace/types";
import { render, screen } from "@/test-utils";
import { InvestigationList } from "./investigation-row";

const investigation = {
  id: "inv-1",
  name: "Chest X-ray",
  category: "imaging",
  status: "ordered",
} as unknown as ClinicalInvestigation;

function renderList(overrides: { uploadingId?: string | null } = {}) {
  return render(
    <InvestigationList
      investigations={[investigation]}
      canAttach
      hasUploadContext
      uploadingId={overrides.uploadingId ?? null}
      onUpdate={vi.fn()}
      onRemove={vi.fn()}
      onAttach={vi.fn().mockResolvedValue(undefined)}
    />,
  );
}

const fileInput = () =>
  document.querySelector('input[type="file"]') as HTMLInputElement;

/**
 * WCAG 2.5.3 (Label in Name, Level A): the words a clinician can read on the
 * control must be part of its accessible name, otherwise voice control cannot
 * invoke it. This control's name came from an `aria-label` on the wrapping
 * `<label>` — "Attach a report or scan" — which overrode the visible
 * "Attach report". The strings differ only by an inserted word, which is easy
 * to miss in review and broken in both locales.
 */
describe("investigation attachment input", () => {
  it("names the file input with its visible label text", () => {
    renderList();

    expect(screen.getByText("Attach report")).toBeInTheDocument();
    expect(fileInput()).toHaveAccessibleName("Attach report");
  });

  it("keeps the accessible name in step with the visible text while uploading", () => {
    renderList({ uploadingId: "inv-1" });

    expect(screen.getByText("Uploading…")).toBeInTheDocument();
    expect(fileInput()).toHaveAccessibleName("Uploading…");
    expect(fileInput()).toBeDisabled();
  });
});