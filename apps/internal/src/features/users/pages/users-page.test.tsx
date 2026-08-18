import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@/test-utils";
import { UsersPage } from "./users-page";
import { apiGet } from "@/lib/api/api-client";

vi.mock("@/lib/api/api-client", () => ({
  apiGet: vi.fn(),
}));

const mockApiGet = vi.mocked(apiGet);

const mockUsers = [
  { id: "u1", name: "Alice Admin", email: "alice@clinic.com", role: "ADMIN", createdAt: "2026-01-10T10:00:00Z", clinicName: "Sunrise Clinic" },
  { id: "u2", name: "Bob Doctor", email: "bob@clinic.com", role: "DOCTOR", specialization: "Cardiology", phoneNumber: "9876543210", createdAt: "2026-02-01T10:00:00Z" },
  { id: "u3", name: "Carol Reception", email: "carol@clinic.com", role: "RECEPTIONIST", createdAt: "2026-03-01T10:00:00Z" },
  { id: "u4", name: "Dana Doctor", email: "dana@clinic.com", role: "DOCTOR", specialization: "Dermatology", createdAt: "2026-04-01T10:00:00Z" },
];

const card = (label: string) => {
  const node = screen.getByText(label).closest(".cursor-pointer");
  expect(node).not.toBeNull();
  return within(node as HTMLElement);
};

describe("UsersPage", () => {
  beforeEach(() => {
    mockApiGet.mockReset();
  });

  it("renders role stat cards with correct counts", async () => {
    mockApiGet.mockResolvedValueOnce(mockUsers);
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("All Users")).toBeInTheDocument();
    });

    expect(card("All Users").getByText("4")).toBeInTheDocument();
    expect(card("Clinic Admins").getByText("1")).toBeInTheDocument();
    expect(card("Admin Doctors").getByText("0")).toBeInTheDocument();
    expect(card("Doctors").getByText("2")).toBeInTheDocument();
    expect(card("Receptionists").getByText("1")).toBeInTheDocument();
  });

  it("renders user rows with role badges, formatted dates, and fallback dashes", async () => {
    mockApiGet.mockResolvedValueOnce(mockUsers);
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Alice Admin")).toBeInTheDocument();
    });

    expect(screen.getByText("bob@clinic.com")).toBeInTheDocument();
    expect(screen.getByText("Cardiology")).toBeInTheDocument();
    expect(screen.getByText("9876543210")).toBeInTheDocument();
    // Fallback dashes for missing specialization / phone.
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
    // Joined dates are formatted as a list date.
    expect(screen.getByText(/Jan 2026/)).toBeInTheDocument();

    // Role badge color contract: ADMIN info, DOCTOR success, RECEPTIONIST warning.
    expect(screen.getByText("ADMIN")).toHaveClass("badge-info");
    const doctorBadges = screen.getAllByText("DOCTOR");
    expect(doctorBadges).toHaveLength(2);
    for (const badge of doctorBadges) {
      expect(badge).toHaveClass("badge-success");
    }
    expect(screen.getByText("RECEPTIONIST")).toHaveClass("badge-warning");
  });

  it("filters users by role when a stat card is clicked", async () => {
    mockApiGet.mockResolvedValueOnce(mockUsers);
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Bob Doctor")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Doctors"));

    expect(screen.getByText("Bob Doctor")).toBeInTheDocument();
    expect(screen.getByText("Dana Doctor")).toBeInTheDocument();
    expect(screen.queryByText("Alice Admin")).not.toBeInTheDocument();
    expect(screen.queryByText("Carol Reception")).not.toBeInTheDocument();
    expect(screen.getByText(/Team Members \(2\)/)).toBeInTheDocument();
  });

  it("searches by name and email case-insensitively", async () => {
    mockApiGet.mockResolvedValueOnce(mockUsers);
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Bob Doctor")).toBeInTheDocument();
    });

    const search = screen.getByPlaceholderText(/Search by name, email/i);
    fireEvent.change(search, { target: { value: "dana" } });
    expect(screen.getByText("Dana Doctor")).toBeInTheDocument();
    expect(screen.queryByText("Bob Doctor")).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: "BOB@CLINIC.COM" } });
    expect(screen.getByText("Bob Doctor")).toBeInTheDocument();
    expect(screen.queryByText("Dana Doctor")).not.toBeInTheDocument();
  });

  it("shows the no-matching-users empty state when the search yields nothing", async () => {
    mockApiGet.mockResolvedValueOnce(mockUsers);
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Bob Doctor")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/Search by name, email/i), {
      target: { value: "zzz-no-such-user" },
    });
    expect(screen.getByText("No matching users")).toBeInTheDocument();
  });

  it("shows the empty state when no users exist", async () => {
    mockApiGet.mockResolvedValueOnce([]);
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("No team members yet")).toBeInTheDocument();
    });
    expect(card("All Users").getByText("0")).toBeInTheDocument();
  });

  it("shows an error state with a working retry", async () => {
    mockApiGet.mockRejectedValueOnce(new Error("boom"));
    mockApiGet.mockResolvedValueOnce(mockUsers);
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.getByText(/could not load team members/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Try again/i }));

    await waitFor(() => {
      expect(screen.getByText("Alice Admin")).toBeInTheDocument();
    });
  });

  it("opens the view dialog with full user details", async () => {
    mockApiGet.mockResolvedValueOnce(mockUsers);
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Alice Admin")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole("button", { name: /View/i })[0]);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("User Details")).toBeInTheDocument();
    expect(within(dialog).getByText("Alice Admin")).toBeInTheDocument();
    expect(within(dialog).getByText("alice@clinic.com")).toBeInTheDocument();
    expect(within(dialog).getByText("N/A")).toBeInTheDocument();
    expect(within(dialog).getByText("ADMIN")).toHaveClass("badge-info");
    expect(within(dialog).getByText(/Jan 2026/)).toBeInTheDocument();
  });
});
