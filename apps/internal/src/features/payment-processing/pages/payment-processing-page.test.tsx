import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PaymentProcessingPage } from "./payment-processing-page";
import { apiGet, apiPost } from "@/lib/api/api-client";

vi.mock("@/lib/api/api-client", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

const mockApiGet = vi.mocked(apiGet);
const mockApiPost = vi.mocked(apiPost);

const mockClinics = [
  { id: "clinic-1", name: "Sunrise Clinic", tier: "ESSENTIAL", email: "billing@sunrise.example" },
  { id: "clinic-2", name: "City Hospital", tier: "PROFESSIONAL", email: "billing@city.example" },
];

const mockPayments = [
  { id: "pay-1", clinicName: "Sunrise Clinic", planLabel: "Essential", amount: 5000, currency: "INR", status: "SUCCESS", paidAt: "2026-07-01T10:00:00Z" },
  { id: "pay-2", clinicName: "City Hospital", planLabel: "Professional", amount: 12000, currency: "INR", status: "FAILED", paidAt: "2026-07-02T10:00:00Z" },
];

describe("PaymentProcessingPage", () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    mockApiPost.mockReset();
    mockApiGet.mockResolvedValue([]);
    mockApiPost.mockResolvedValue({});
  });

  it("renders clinics and payments after loading, with formatted amounts and status badges", async () => {
    mockApiGet.mockResolvedValueOnce(mockClinics).mockResolvedValueOnce(mockPayments);
    render(<PaymentProcessingPage />);

    expect(screen.getByText("Loading payment processing…")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Sunrise Clinic")).toBeInTheDocument();
    });
    expect(screen.getByText("City Hospital")).toBeInTheDocument();
    expect(screen.getByText("SUCCESS")).toBeInTheDocument();
    expect(screen.getByText("FAILED")).toBeInTheDocument();
    expect(screen.getByText("₹5,000")).toBeInTheDocument();
    expect(screen.getByText("₹12,000")).toBeInTheDocument();

    // Record button stays disabled until a clinic and amount are provided.
    expect(screen.getByRole("button", { name: /Record Payment/i })).toBeDisabled();
  });

  it("shows an empty row when no payments are recorded", async () => {
    mockApiGet.mockResolvedValueOnce(mockClinics).mockResolvedValueOnce([]);
    render(<PaymentProcessingPage />);

    await waitFor(() => {
      expect(screen.getByText("No payments recorded")).toBeInTheDocument();
    });
  });

  it("posts the manual payment payload, clears the amount, and refetches", async () => {
    mockApiGet.mockResolvedValueOnce(mockClinics).mockResolvedValueOnce([]);
    mockApiPost.mockResolvedValue({ ok: true });
    render(<PaymentProcessingPage />);

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    const recordButton = screen.getByRole("button", { name: /Record Payment/i });
    expect(recordButton).toBeDisabled();

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: /Sunrise Clinic/i }));

    const amountInput = screen.getByPlaceholderText("Enter amount");
    fireEvent.change(amountInput, { target: { value: "7500" } });

    // Pick a non-default tier.
    fireEvent.click(screen.getAllByRole("combobox")[1]);
    fireEvent.click(screen.getByRole("option", { name: "Professional" }));

    expect(recordButton).not.toBeDisabled();
    fireEvent.click(recordButton);

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledTimes(1);
      const [path, body] = mockApiPost.mock.calls[0];
      expect(path).toBe("/api/internal/clinics/clinic-1/process-payment");
      expect(body).toMatchObject({
        amount: 7500,
        currency: "INR",
        newTier: "PROFESSIONAL",
        paymentMethod: "MANUAL",
      });
      expect(typeof body.paymentId).toBe("string");
      expect(body.paymentId.startsWith("manual-")).toBe(true);
    });

    // The refetch reloads DataState, remounting the form — assert on a fresh element.
    // (type=number inputs break jest-dom's toHaveValue(""), so check the raw value.)
    await waitFor(() => {
      const input = screen.getByPlaceholderText("Enter amount") as HTMLInputElement;
      expect(input.value).toBe("");
    });
    // Refetch after the write: initial load (2 calls) + refetch (2 calls).
    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledTimes(4);
    });
  });

  it("disables the button and shows the processing label while a payment is in flight", async () => {
    mockApiGet.mockResolvedValueOnce(mockClinics).mockResolvedValueOnce([]);
    mockApiPost.mockReturnValueOnce(new Promise<never>(() => {}));
    render(<PaymentProcessingPage />);

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: /Sunrise Clinic/i }));
    fireEvent.change(screen.getByPlaceholderText("Enter amount"), { target: { value: "1000" } });
    fireEvent.click(screen.getByRole("button", { name: /Record Payment/i }));

    expect(screen.getByRole("button", { name: /Processing/i })).toBeDisabled();
  });
});
