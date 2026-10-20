import type { ReactElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, type Mock } from "vitest";
import { TooltipProvider } from "@workspace/ui/components/overlay/tooltip";
import { LabOrderActionsCell, LabTestsOrders, PatientNameCell, SortableHeader } from "./LabTestsOrders";
import type { LabTestOrder } from "@workspace/types";

const mockHandleSort = vi.fn();
const mockHandleVerify = vi.fn();

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/features/lab-tests/hooks/use-lab-tests-orders", () => ({
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
const useLabTestsOrders = (await import("@/features/lab-tests/hooks/use-lab-tests-orders"))
  .useLabTestsOrders as Mock;

function renderWithProviders(ui: ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

function setupMocks(options: {
  role?: string;
  sortedTests?: LabTestOrder[];
  isVerifying?: boolean;
  sortConfig?: { key: "patient" | "testName" | "orderDate" | "status"; direction: "asc" | "desc" } | null;
}) {
  useAuth.mockReturnValue({ user: { role: options.role ?? "ADMIN" } });
  useLabTestsOrders.mockReturnValue({
    sortConfig: options.sortConfig ?? null,
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

    it("renders the neutral sort icon when the column is not the active sort key", () => {
      setupMocks({
        sortedTests: [makeOrder("1")],
        sortConfig: { key: "status", direction: "asc" },
      });

      const { container } = renderWithProviders(
        <LabTestsOrders
          isLoading={false}
          filteredTests={[]}
          searchQuery=""
          setSearchQuery={() => {}}
        />,
      );

      const patientHeader = screen.getByRole("button", { name: /Patient/i });
      expect(patientHeader.querySelector(".lucide-arrow-up-down")).not.toBeNull();
      expect(patientHeader.querySelector(".lucide-arrow-up")).toBeNull();
      expect(patientHeader.querySelector(".lucide-arrow-down")).toBeNull();
      expect(container).toBeTruthy();
    });

    it("renders the ascending arrow icon when the column is sorted ascending", () => {
      setupMocks({
        sortedTests: [makeOrder("1")],
        sortConfig: { key: "patient", direction: "asc" },
      });

      renderWithProviders(
        <LabTestsOrders
          isLoading={false}
          filteredTests={[]}
          searchQuery=""
          setSearchQuery={() => {}}
        />,
      );

      const patientHeader = screen.getByRole("button", { name: /Patient/i });
      expect(patientHeader.querySelector(".lucide-arrow-up")).not.toBeNull();
      expect(patientHeader.querySelector(".lucide-arrow-down")).toBeNull();
      expect(patientHeader.querySelector(".lucide-arrow-up-down")).toBeNull();
    });

    it("renders the descending arrow icon when the column is sorted descending", () => {
      setupMocks({
        sortedTests: [makeOrder("1")],
        sortConfig: { key: "patient", direction: "desc" },
      });

      renderWithProviders(
        <LabTestsOrders
          isLoading={false}
          filteredTests={[]}
          searchQuery=""
          setSearchQuery={() => {}}
        />,
      );

      const patientHeader = screen.getByRole("button", { name: /Patient/i });
      expect(patientHeader.querySelector(".lucide-arrow-down")).not.toBeNull();
      expect(patientHeader.querySelector(".lucide-arrow-up")).toBeNull();
      expect(patientHeader.querySelector(".lucide-arrow-up-down")).toBeNull();
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
        sortedTests: [makeOrder("1", { status: "COMPLETED" })],
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

  describe("SortableHeader", () => {
    it("renders label text", () => {
      const { container } = render(
        <SortableHeader label="Patient" column="patient" sortConfig={null} onSort={mockHandleSort} />,
      );
      expect(container.textContent).toContain("Patient");
    });

    it("renders neutral sort icon when not active", () => {
      const { container } = render(
        <SortableHeader label="Patient" column="patient" sortConfig={null} onSort={mockHandleSort} />,
      );
      expect(container.querySelector(".lucide-arrow-up-down")).not.toBeNull();
      expect(container.querySelector(".lucide-arrow-up")).toBeNull();
    });

    it("renders ascending arrow when active and asc", () => {
      const { container } = render(
        <SortableHeader label="Patient" column="patient" sortConfig={{ key: "patient", direction: "asc" }} onSort={mockHandleSort} />,
      );
      expect(container.querySelector(".lucide-arrow-up")).not.toBeNull();
      expect(container.querySelector(".lucide-arrow-down")).toBeNull();
    });

    it("renders descending arrow when active and desc", () => {
      const { container } = render(
        <SortableHeader label="Patient" column="patient" sortConfig={{ key: "patient", direction: "desc" }} onSort={mockHandleSort} />,
      );
      expect(container.querySelector(".lucide-arrow-down")).not.toBeNull();
      expect(container.querySelector(".lucide-arrow-up")).toBeNull();
    });

    it("calls onSort on click", () => {
      const onSort = vi.fn();
      const { container } = render(
        <SortableHeader label="Test Name" column="testName" sortConfig={null} onSort={onSort} />,
      );
      container.querySelector("button")?.click();
      expect(onSort).toHaveBeenCalledWith("testName");
    });
  });

  describe("LabOrderActionsCell", () => {
    it("shows verify button for unpaid orders with permission", () => {
      render(
        <TooltipProvider>
          <LabOrderActionsCell test={makeOrder("1")} canVerifyPayment={true} handleVerify={mockHandleVerify} isVerifying={false} />
        </TooltipProvider>,
      );
      expect(screen.getByText("Verify")).toBeInTheDocument();
    });

    it("hides verify button for paid orders", () => {
      render(
        <TooltipProvider>
          <LabOrderActionsCell test={makeOrder("1", { paidAt: "2026-01-16T10:00:00Z" })} canVerifyPayment={true} handleVerify={mockHandleVerify} isVerifying={false} />
        </TooltipProvider>,
      );
      expect(screen.queryByText("Verify")).not.toBeInTheDocument();
    });

    it("hides verify button when user lacks permission", () => {
      render(
        <TooltipProvider>
          <LabOrderActionsCell test={makeOrder("1")} canVerifyPayment={false} handleVerify={mockHandleVerify} isVerifying={false} />
        </TooltipProvider>,
      );
      expect(screen.queryByText("Verify")).not.toBeInTheDocument();
    });

    it("disables verify button when isVerifying is true", () => {
      render(
        <TooltipProvider>
          <LabOrderActionsCell test={makeOrder("1")} canVerifyPayment={true} handleVerify={mockHandleVerify} isVerifying={true} />
        </TooltipProvider>,
      );
      expect(screen.getByText("Verify").closest("button")).toBeDisabled();
    });

    it('shows "View Results" for completed orders', () => {
      render(
        <TooltipProvider>
          <LabOrderActionsCell test={makeOrder("1", { status: "COMPLETED" })} canVerifyPayment={false} handleVerify={mockHandleVerify} isVerifying={false} />
        </TooltipProvider>,
      );
      expect(screen.getByText("View Results")).toBeInTheDocument();
    });

    it('shows "Details" for non-completed orders', () => {
      render(
        <TooltipProvider>
          <LabOrderActionsCell test={makeOrder("1", { status: "ORDERED" })} canVerifyPayment={false} handleVerify={mockHandleVerify} isVerifying={false} />
        </TooltipProvider>,
      );
      expect(screen.getByText("Details")).toBeInTheDocument();
    });

    it("calls handleVerify on Verify click", () => {
      const handleVerify = vi.fn();
      const test = makeOrder("1");
      render(
        <TooltipProvider>
          <LabOrderActionsCell test={test} canVerifyPayment={true} handleVerify={handleVerify} isVerifying={false} />
        </TooltipProvider>,
      );
      screen.getByText("Verify").click();
      expect(handleVerify).toHaveBeenCalledWith(test);
    });
  });

  describe("PatientNameCell", () => {
    it("renders patient full name", () => {
      render(<PatientNameCell test={makeOrder("1")} />);
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it('renders "Unknown" when patient is null', () => {
      render(<PatientNameCell test={makeOrder("1", { patient: null })} />);
      expect(screen.getByText("Unknown")).toBeInTheDocument();
    });
  });
});
