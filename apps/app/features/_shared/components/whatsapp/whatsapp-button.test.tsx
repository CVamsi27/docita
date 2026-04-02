import { fireEvent, render, screen } from "@testing-library/react";
import { WhatsAppButton } from "./whatsapp-button";
import { beforeEach, describe, expect, it, vi } from "vitest";

const openMock = vi.fn();
Object.defineProperty(window, "open", { value: openMock });

describe("WhatsAppButton", () => {
  beforeEach(() => {
    openMock.mockClear();
  });

  it("renders correctly with label", () => {
    render(<WhatsAppButton phoneNumber="1234567890" label="Contact Support" />);
    expect(screen.getByText("Contact Support")).toBeInTheDocument();
  });

  it("opens WhatsApp URL on click with phone number", () => {
    render(<WhatsAppButton phoneNumber="1234567890" message="Hello" />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(openMock).toHaveBeenCalledWith(
      "https://wa.me/1234567890?text=Hello",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("is disabled when no phone number is provided", () => {
    render(<WhatsAppButton />);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  it("opens generic WhatsApp composer when allowGenericLink is enabled", () => {
    render(<WhatsAppButton allowGenericLink message="Need onboarding help" />);

    const button = screen.getByRole("button");
    expect(button).not.toBeDisabled();
    fireEvent.click(button);

    expect(openMock).toHaveBeenCalledWith(
      "https://wa.me/?text=Need%20onboarding%20help",
      "_blank",
      "noopener,noreferrer",
    );
  });
});
