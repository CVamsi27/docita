import { render, screen, fireEvent, waitFor } from "@/test-utils";
import { describe, expect, it, vi } from "vitest";
import { PartnerBankingForm } from "./PartnerBankingForm";

const { mutateAsyncMock, buildContextMock } = vi.hoisted(() => ({
  mutateAsyncMock: vi.fn(),
  buildContextMock: vi.fn(() => ({ accessToken: "tok_123", baseUrl: "https://api.test" })),
}));

vi.mock("@/features/referral-partner/hooks/use-partner-auth", () => ({
  usePartnerAuth: () => ({
    buildContext: buildContextMock,
  }),
}));

vi.mock("@workspace/data-access", () => ({
  usePartnerMe: () => ({
    data: null,
    isLoading: false,
  }),
  usePartnerPayoutDetails: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}));

describe("PartnerBankingForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the form with all fields", () => {
    render(<PartnerBankingForm />);

    expect(screen.getByLabelText(/account holder/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/account number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ifsc/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/bank name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/upi/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/pan/i)).toBeInTheDocument();
  });

  it("shows validation error for invalid IFSC", async () => {
    render(<PartnerBankingForm />);

    fireEvent.change(screen.getByLabelText(/ifsc/i), { target: { value: "INVALID" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/ifsc/i)).toBeInTheDocument();
    });
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it("shows validation error for short account number", async () => {
    render(<PartnerBankingForm />);

    fireEvent.change(screen.getByLabelText(/account number/i), { target: { value: "123" } });
    fireEvent.change(screen.getByLabelText(/ifsc/i), { target: { value: "HDFC0123456" } });
    fireEvent.change(screen.getByLabelText(/account holder/i), { target: { value: "Test User" } });
    fireEvent.change(screen.getByLabelText(/bank name/i), { target: { value: "HDFC Bank" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      // The validation error text contains "account number" but so does the label;
      // match the error alert specifically
      const alerts = screen.getAllByRole("alert");
      expect(alerts.some((a) => /account number/i.test(a.textContent ?? ""))).toBe(true);
    });
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it("submits valid data successfully", async () => {
    mutateAsyncMock.mockResolvedValueOnce({});
    render(<PartnerBankingForm />);

    fireEvent.change(screen.getByLabelText(/account holder/i), { target: { value: "Test User" } });
    fireEvent.change(screen.getByLabelText(/account number/i), { target: { value: "123456789012" } });
    fireEvent.change(screen.getByLabelText(/ifsc/i), { target: { value: "HDFC0123456" } });
    fireEvent.change(screen.getByLabelText(/bank name/i), { target: { value: "HDFC Bank" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          accountHolder: "Test User",
          accountNumber: "123456789012",
          ifsc: "HDFC0123456",
          bankName: "HDFC Bank",
        }),
      );
    });
  });

  it("shows success message after successful submission", async () => {
    mutateAsyncMock.mockResolvedValueOnce({});
    render(<PartnerBankingForm />);

    fireEvent.change(screen.getByLabelText(/account holder/i), { target: { value: "Test User" } });
    fireEvent.change(screen.getByLabelText(/account number/i), { target: { value: "123456789012" } });
    fireEvent.change(screen.getByLabelText(/ifsc/i), { target: { value: "HDFC0123456" } });
    fireEvent.change(screen.getByLabelText(/bank name/i), { target: { value: "HDFC Bank" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/saved/i)).toBeInTheDocument();
    });
  });
});
