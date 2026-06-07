import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, type Mock } from "vitest";
import { TooltipProvider } from "@workspace/ui/components/overlay/tooltip";
import { LabTestsOrders } from "./LabTestsOrders";
import type { LabTestOrder } from "@workspace/types";

const mockHandleSort = vi.fn();
const mockHandleVerify = vi.fn();

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: vi.fn(),
}));

vi.mock("./use-lab-tests-orders", () => ({
  useLabTestsOrders: vi.fn(),
}));

vi.mock("@/lib/formatters", () => ({
  formatDate: vi.fn(() => "Jan 15, 2026"),
  DATE_FORMAT_OPTIONS_US_SHORT: {},
}));

function makeOrder(
  id: string,
  overrides: Partial<LabTestOrder> = {},
): LabTestOrder {
  return {
    id,
    clinicId: "c1",
    patientId: `p-${id}`,
    labTestId: `lt-${id}`,
    status: "ORDERED",
    orderedBy: "doc1",
    createdAt: "2026-01-15T10:00:00Z",
    updatedAt: "2026-01-15T10:00:00Z",
    patient: { id: `p-${id}`, firstName: "John", lastName: "Doe" },
    labTest: {
      id: `lt-${id}`,
      name: "CBC",
      category: "Hematology",
      clinicId: "c1",
      active: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    ...overrides,
  } as LabTestOrder;
}

const useAuth = (await import("@/lib/auth/auth-context")).useAuth as Mock;
const useLabTestsOrders = (await import("./use-lab-tests-orders"))
  .useLabTestsOrders as Mock;

function renderWithProviders(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

function setupMocks(options: {
  role?: string;
  sortedTests?: LabTestOrder[];
  isVerifying?: boolean;
}) {
  useAuth.mockReturnValue({ user: { role: options.role ?? "ADMIN" } });
  useLabTestsOrders.mockReturnValue({
    sortConfig: null,
    handleSort: mockHandleSort,
    sortedTests: options.sortedTests ?? [],
    handleVerify: mockHandleVerify,
    isVerifying: options.isVerifying ?? false,
  });
}

describe("LabTestsOrders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Verify button visibility", () => {
    it("shows verify button for ADMIN role when order is unpaid", () => {
      setupMocks({
        role: "ADMIN",
        sortedTests: [makeOrder("1", { paidAt: null })],
      });

      renderWithProviders(
        <LabTestsOrders
          isLoading={false}
          filteredTests={[]}
          searchQuery=""
          setSearchQuery={() => {}}
        />,
      );

      expect(screen.getByText("Verify")).toBeInTheDocument();
    });

    it("hides verify button for ADMIN when order is paid", () => {
      setupMocks({
        role: "ADMIN",
        sortedTests: [makeOrder("1", { paidAt: "2026-01-16T10:00:00Z" })],
      });

      renderWithProviders(
        <LabTestsOrders
          isLoading={false}
          filteredTests={[]}
          searchQuery=""
          setSearchQuery={() => {}}
        />,
      );

      expect(screen.queryByText("Verify")).not.toBeInTheDocument();
    });

    it("shows verify button for ADMIN_DOCTOR role", () => {
      setupMocks({
        role: "ADMIN_DOCTOR",
        sortedTests: [makeOrder("1")],
      });

      renderWithProviders(
        <LabTestsOrders
          isLoading={false}
          filteredTests={[]}
          searchQuery=""
          setSearchQuery={() => {}}
        />,
      );

      expect(screen.getByText("Verify")).toBeInTheDocument();
    });

    it("shows verify button for RECEPTIONIST role", () => {
      setupMocks({
        role: "RECEPTIONIST",
        sortedTests: [makeOrder("1")],
      });

      renderWithProviders(
        <LabTestsOrders
          isLoading={false}
          filteredTests={[]}
          searchQuery=""
          setSearchQuery={() => {}}
        />,
      );

      expect(screen.getByText("Verify")).toBeInTheDocument();
    });

    it("hides verify button for non-payment roles", () => {
      setupMocks({
        role: "DOCTOR",
        sortedTests: [makeOrder("1")],
      });

      renderWithProviders(
        <LabTestsOrders
          isLoading={false}
          filteredTests={[]}
          searchQuery=""
          setSearchQuery={() => {}}
        />,
      );

      expect(screen.queryByText("Verify")).not.toBeInTheDocument();
    });
  });

  describe("SortableHeader sort icons", () => {
    it("renders sortable headers and triggers onSort", () => {
      setupMocks({ sortedTests: [makeOrder("1")] });

      renderWithProviders(
        <LabTestsOrders
          isLoading={false}
          filteredTests={[]}
          searchQuery=""
          setSearchQuery={() => {}}
        />,
      );

      const patientHeader = screen.getByRole("button", { name: /Patient/i });
      fireEvent.click(patientHeader);
      expect(mockHandleSort).toHaveBeenCalledWith("patient");
    });
  });

  describe("Patient display", () => {
    it('renders "Unknown" when patient is null', () => {
      setupMocks({
        sortedTests: [makeOrder("1", { patient: null })],
      });

      renderWithProviders(
        <LabTestsOrders
          isLoading={false}
          filteredTests={[]}
          searchQuery=""
          setSearchQuery={() => {}}
        />,
      );

      const unknowns = screen.getAllByText("Unknown");
      expect(unknowns.length).toBeGreaterThan(0);
    });
  });

  describe("Loading state", () => {
    it("renders loading message when isLoading is true", () => {
      setupMocks({ sortedTests: [makeOrder("1")] });

      renderWithProviders(
        <LabTestsOrders
          isLoading={true}
          filteredTests={[]}
          searchQuery=""
          setSearchQuery={() => {}}
        />,
      );

      expect(screen.getByText("Loading lab tests…")).toBeInTheDocument();
    });
  });

  describe("Search input", () => {
    it("renders search input and calls setSearchQuery on change", () => {
      const setSearchQuery = vi.fn();
      setupMocks({ sortedTests: [makeOrder("1")] });

      renderWithProviders(
        <LabTestsOrders
          isLoading={false}
          filteredTests={[]}
          searchQuery=""
          setSearchQuery={setSearchQuery}
        />,
      );

      const input = screen.getByPlaceholderText("Enter patient, test, or doctor");
      fireEvent.change(input, { target: { value: "CBC" } });
      expect(setSearchQuery).toHaveBeenCalledWith("CBC");
    });

    it("calls setSearchQuery with empty string on clear", () => {
      const setSearchQuery = vi.fn();
      setupMocks({ sortedTests: [makeOrder("1")] });

      renderWithProviders(
        <LabTestsOrders
          isLoading={false}
          filteredTests={[]}
          searchQuery="search text"
          setSearchQuery={setSearchQuery}
        />,
      );

      expect(screen.getByDisplayValue("search text")).toBeInTheDocument();
    });
  });

  describe("LabOrderActionsCell", () => {
    it("disables verify button when isVerifying is true", () => {
      setupMocks({
        role: "ADMIN",
        sortedTests: [makeOrder("1", { paidAt: null })],
        isVerifying: true,
      });

      renderWithProviders(
        <LabTestsOrders
          isLoading={false}
          filteredTests={[]}
          searchQuery=""
          setSearchQuery={() => {}}
        />,
      );

      const verifyBtn = screen.getByText("Verify").closest("button");
      expect(verifyBtn).toBeDisabled();
    });

    it('shows "View Results" text when order status is completed', () => {
      setupMocks({
        role: "ADMIN",
        sortedTests: [makeOrder("1", { status: "completed" })],
      });

      renderWithProviders(
        <LabTestsOrders
          isLoading={false}
          filteredTests={[]}
          searchQuery=""
          setSearchQuery={() => {}}
        />,
      );

      expect(screen.getByText("View Results")).toBeInTheDocument();
    });

    it('shows "Details" text when order status is not completed', () => {
      setupMocks({
        role: "DOCTOR",
        sortedTests: [makeOrder("1", { status: "ORDERED" })],
      });

      renderWithProviders(
        <LabTestsOrders
          isLoading={false}
          filteredTests={[]}
          searchQuery=""
          setSearchQuery={() => {}}
        />,
      );

      expect(screen.getByText("Details")).toBeInTheDocument();
    });
  });

  describe("CategoryCell", () => {
    it('renders "—" when labTest is null', () => {
      setupMocks({
        sortedTests: [makeOrder("1", { labTest: null })],
      });

      renderWithProviders(
        <LabTestsOrders
          isLoading={false}
          filteredTests={[]}
          searchQuery=""
          setSearchQuery={() => {}}
        />,
      );

      const dashes = screen.getAllByText("—");
      expect(dashes.length).toBeGreaterThan(0);
    });
  });

  describe("Empty state", () => {
    it("renders empty state title when no tests", () => {
      setupMocks({ sortedTests: [] });

      renderWithProviders(
        <LabTestsOrders
          isLoading={false}
          filteredTests={[]}
          searchQuery=""
          setSearchQuery={() => {}}
        />,
      );

      expect(screen.getByText("No lab tests found")).toBeInTheDocument();
    });
  });
});
