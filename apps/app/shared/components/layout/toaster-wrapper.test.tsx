import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToasterWrapper } from "./toaster-wrapper";

const toasterMock = vi.hoisted(() =>
  vi.fn((_props: Record<string, unknown>) => null),
);

vi.mock("sonner", () => ({
  Toaster: toasterMock,
}));

describe("ToasterWrapper", () => {
  beforeEach(() => {
    toasterMock.mockClear();
  });

  it("keeps stacked messages expanded and individually dismissible", async () => {
    render(<ToasterWrapper />);

    await waitFor(() => {
      expect(toasterMock).toHaveBeenCalled();
    });

    expect(toasterMock.mock.calls.at(-1)?.[0]).toMatchObject({
      closeButton: true,
      duration: 5000,
      expand: true,
      richColors: true,
      position: "top-right",
      visibleToasts: Number.POSITIVE_INFINITY,
    });
  });
});
