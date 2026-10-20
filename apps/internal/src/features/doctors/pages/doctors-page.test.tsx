import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@/test-utils";
import { DoctorsPage } from "./doctors-page";
import { apiGet } from "@/lib/api/api-client";

vi.mock("@/lib/api/api-client", () => ({
  apiGet: vi.fn(),
}));

const mockApiGet = vi.mocked(apiGet);

const mockDoctors = [
  {
    id: "d1",
    name: "Alice Verified",
    email: "alice@clinic.com",
    registrationNumber: "R12345",
    registrationCouncil: "NMC",
    registrationStateCode: "KA",
    verificationStatus: "VERIFIED",
    verificationReason: "Credentials confirmed against NMC register",
    verificationSource: "NMC",
    verificationCheckedAt: "2026-01-15T10:00:00Z",
    clinic: { id: "clinic-1", name: "Sunrise Clinic" },
  },
  {
    id: "d2",
    name: "Bob Pending",
    email: "bob@clinic.com",
    clinic: { id: "clinic-2", name: "City Hospital" },
  },
];

const rowFor = (name: string) => {
  const row = screen.getByText(name).closest("tr");
  expect(row).not.toBeNull();
  return within(row as HTMLElement);
};

describe("DoctorsPage", () => {
  it("names the doctor view action by identity", async () => {
    mockApiGet.mockResolvedValueOnce(mockDoctors);
    render(<DoctorsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "View doctor: Alice Verified" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
  beforeEach(() => {
    mockApiGet.mockReset();
  });

  it("renders doctors with name prefix, verification badges, registration, and fallbacks", async () => {
    mockApiGet.mockResolvedValueOnce(mockDoctors);
    render(<DoctorsPage />);

    await waitFor(() => {
      expect(screen.getByText("Dr. Alice Verified")).toBeInTheDocument();
    });

    // Verified doctor: registration badge + VERIFIED status + reason + clinic.
    expect(screen.getByText("R12345")).toBeInTheDocument();
    expect(screen.getByText("VERIFIED")).toBeInTheDocument();
    expect(
      screen.getByText("Credentials confirmed against NMC register"),
    ).toBeInTheDocument();
    expect(screen.getByText("Sunrise Clinic")).toBeInTheDocument();

    // Pending doctor: no status -> "Pending", no registration -> dash fallback.
    expect(screen.getByText("Dr. Bob Pending")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
  });

  it("filters doctors by name and email case-insensitively", async () => {
    mockApiGet.mockResolvedValueOnce(mockDoctors);
    render(<DoctorsPage />);

    await waitFor(() => {
      expect(screen.getByText("Dr. Alice Verified")).toBeInTheDocument();
    });

    const search = screen.getByPlaceholderText(/Search doctors by name or email/);
    fireEvent.change(search, { target: { value: "bob" } });
    expect(screen.getByText("Dr. Bob Pending")).toBeInTheDocument();
    expect(screen.queryByText("Dr. Alice Verified")).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: "ALICE@CLINIC.COM" } });
    expect(screen.getByText("Dr. Alice Verified")).toBeInTheDocument();
    expect(screen.queryByText("Dr. Bob Pending")).not.toBeInTheDocument();
  });

  it("shows the empty state when no doctors exist", async () => {
    mockApiGet.mockResolvedValueOnce([]);
    render(<DoctorsPage />);

    await waitFor(() => {
      expect(screen.getByText("No doctors found")).toBeInTheDocument();
    });
  });

  it("opens the view dialog with the full profile and verification notes", async () => {
    mockApiGet.mockResolvedValueOnce(mockDoctors);
    render(<DoctorsPage />);

    await waitFor(() => {
      expect(screen.getByText("Dr. Alice Verified")).toBeInTheDocument();
    });

    // Row action: the single Eye button.
    fireEvent.click(rowFor("Dr. Alice Verified").getAllByRole("button")[0]);

    // Radix Dialog mounts portal content async.
    const dialog = within(await screen.findByRole("dialog"));
    expect(dialog.getByText("Complete doctor profile and credentials")).toBeInTheDocument();
    expect(dialog.getByText("alice@clinic.com")).toBeInTheDocument();
    expect(dialog.getByText("Sunrise Clinic")).toBeInTheDocument();
    expect(dialog.getByText("R12345")).toBeInTheDocument();
    expect(dialog.getByText("Verification Notes")).toBeInTheDocument();
    expect(
      dialog.getByText("Credentials confirmed against NMC register"),
    ).toBeInTheDocument();
  });
});
