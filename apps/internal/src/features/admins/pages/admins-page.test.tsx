import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AdminsPage } from "./admins-page";
import { apiGet, apiPatch, apiPost } from "@/lib/api/api-client";

vi.mock("@/lib/api/api-client", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
}));

const mockApiGet = vi.mocked(apiGet);
const mockApiPost = vi.mocked(apiPost);
const mockApiPatch = vi.mocked(apiPatch);

const mockAdmins = [
  { id: "a1", name: "Alice Admin", email: "alice@clinic.com", phoneNumber: "9876543210", role: "ADMIN", appLoginDisabled: false, createdAt: "2026-01-10T10:00:00Z" },
  { id: "a2", name: "Bob Doctor", email: "bob@clinic.com", role: "ADMIN_DOCTOR", appLoginDisabled: true, createdAt: "2026-02-01T10:00:00Z" },
];

const mockClinics = { data: [{ id: "clinic-1", name: "Sunrise Clinic" }] };

const loadData = () => {
  mockApiGet.mockImplementation((url: string) =>
    url.includes("/clinics") ? Promise.resolve(mockClinics) : Promise.resolve(mockAdmins),
  );
};

const rowFor = (name: string) => {
  const row = screen.getByText(name).closest("tr");
  expect(row).not.toBeNull();
  return within(row as HTMLElement);
};

describe("AdminsPage", () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    mockApiPost.mockReset();
    mockApiPatch.mockReset();
    mockApiPost.mockResolvedValue({});
    mockApiPatch.mockResolvedValue({});
  });

  it("renders admin rows with role labels, access badges, formatted dates, and phone fallback", async () => {
    loadData();
    render(<AdminsPage />);

    await waitFor(() => {
      expect(screen.getByText("Alice Admin")).toBeInTheDocument();
    });

    // Role label mapping (ADMIN -> Clinic Admin, ADMIN_DOCTOR -> Admin Doctor).
    expect(screen.getByText("Clinic Admin")).toBeInTheDocument();
    expect(screen.getByText("Admin Doctor")).toBeInTheDocument();

    // Access state badges.
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Disabled")).toBeInTheDocument();

    // Phone shown for Alice, dash fallback for Bob.
    expect(screen.getByText("9876543210")).toBeInTheDocument();
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);

    // Created dates formatted as list dates (en-IN).
    expect(screen.getByText(/Jan 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Feb 2026/)).toBeInTheDocument();
  });

  it("filters admins by name and email case-insensitively", async () => {
    loadData();
    render(<AdminsPage />);

    await waitFor(() => {
      expect(screen.getByText("Alice Admin")).toBeInTheDocument();
    });

    const search = screen.getByPlaceholderText(/Enter name or email/);
    fireEvent.change(search, { target: { value: "bob" } });
    expect(screen.getByText("Bob Doctor")).toBeInTheDocument();
    expect(screen.queryByText("Alice Admin")).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: "ALICE@CLINIC.COM" } });
    expect(screen.getByText("Alice Admin")).toBeInTheDocument();
    expect(screen.queryByText("Bob Doctor")).not.toBeInTheDocument();
  });

  it("requires a clinic before creating, then posts the form and refetches", async () => {
    loadData();
    render(<AdminsPage />);

    await waitFor(() => {
      expect(screen.getByText("Alice Admin")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Add Admin/ }));
    const dialog = within(await screen.findByRole("dialog"));

    // Guard: no clinic selected -> Create Admin does nothing.
    fireEvent.click(dialog.getByRole("button", { name: "Create Admin" }));
    expect(mockApiPost).not.toHaveBeenCalled();

    // Pick a clinic via the radix select (first combobox in the dialog), then fill the form.
    fireEvent.click(dialog.getAllByRole("combobox")[0]);
    fireEvent.click(await screen.findByRole("option", { name: "Sunrise Clinic" }));

    fireEvent.change(dialog.getByPlaceholderText("Admin name"), {
      target: { value: "Carol New" },
    });
    fireEvent.change(dialog.getByPlaceholderText("Email"), {
      target: { value: "carol@clinic.com" },
    });
    fireEvent.change(dialog.getByPlaceholderText("Password"), {
      target: { value: "secret123" },
    });

    fireEvent.click(dialog.getByRole("button", { name: "Create Admin" }));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith(
        "/api/internal/admins",
        expect.objectContaining({
          clinicId: "clinic-1",
          name: "Carol New",
          email: "carol@clinic.com",
          adminType: "admin",
        }),
      );
    });
    // Refetch after create.
    expect(mockApiGet).toHaveBeenCalledWith("/api/internal/admins");
  });

  it("deactivates an admin through the confirmation dialog", async () => {
    loadData();
    render(<AdminsPage />);

    await waitFor(() => {
      expect(screen.getByText("Alice Admin")).toBeInTheDocument();
    });

    // Row actions: view, edit, deactivate (index 2 for an active admin).
    fireEvent.click(rowFor("Alice Admin").getAllByRole("button")[2]);

    // Danger confirmations render with role "alertdialog" (see ConfirmationDialog).
    const confirm = within(await screen.findByRole("alertdialog"));
    expect(confirm.getByText("Deactivate admin?")).toBeInTheDocument();
    fireEvent.click(confirm.getByRole("button", { name: "Deactivate" }));

    await waitFor(() => {
      expect(mockApiPatch).toHaveBeenCalledWith(
        "/api/internal/admins/a1/deactivate",
      );
    });
    expect(mockApiGet).toHaveBeenCalledWith("/api/internal/admins");
  });

  it("re-activates a disabled admin", async () => {
    loadData();
    render(<AdminsPage />);

    await waitFor(() => {
      expect(screen.getByText("Bob Doctor")).toBeInTheDocument();
    });

    // Row actions for a disabled admin: view, (edit disabled), activate.
    fireEvent.click(rowFor("Bob Doctor").getAllByRole("button")[2]);

    await waitFor(() => {
      expect(mockApiPatch).toHaveBeenCalledWith(
        "/api/internal/admins/a2/activate",
      );
    });
  });
});
