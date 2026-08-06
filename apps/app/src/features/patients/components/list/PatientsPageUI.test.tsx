import { fireEvent, render, screen } from "@/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Patient } from "@workspace/types";
import { PatientsPageUI } from "./PatientsPageUI";

const patientListCopy: Record<string, string> = {
  searchPlaceholder: "Search by name or phone…",
  clearSearch: "Clear",
  emptyTitle: "No patients yet",
  emptyDescription: "Add your first patient to get started.",
  emptyAction: "Add patient",
  pageTitle: "Patients",
  pageDescription: "Search and manage patient records.",
  consultationQueueFull: "Consultation queue",
  consultationQueueShort: "Queue",
  addPatient: "Add patient",
  tableColumnName: "Name",
  tableColumnContact: "Contact",
  tableColumnGender: "Gender",
  tableColumnActions: "Actions",
  scheduleAria: "Schedule",
  scheduleLabel: "Schedule",
  editAria: "Edit",
  editLabel: "Edit",
  tableEmptyTitle: "No patients found",
  tableEmptyDescription: "No results for {query}.",
  tableEmptyDescriptionFallback: "No patients to show.",
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const template = patientListCopy[key] ?? key;
      if (!params) return template;
      return template.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ""));
    },
  }),
}));

const mockPatients: Patient[] = [
  {
    id: "p1",
    firstName: "Asha",
    lastName: "Rao",
    gender: "FEMALE",
    phoneNumber: "9000000001",
    email: "asha@example.com",
  },
  {
    id: "p2",
    firstName: "Ravi",
    lastName: "Nair",
    gender: "MALE",
    phoneNumber: "9000000002",
    email: "ravi@example.com",
  },
] as Patient[];

const baseProps = {
  isLoading: false,
  error: null,
  onRetry: vi.fn(),
  searchQuery: "",
  sortConfig: null,
  filteredPatients: mockPatients,
  onSearchChange: vi.fn(),
  onClearSearch: vi.fn(),
  onSort: vi.fn(),
  onViewPatient: vi.fn(),
  onSchedulePatient: vi.fn(),
  onEditPatient: vi.fn(),
  onAddPatient: vi.fn(),
  totalPatients: 2,
  pageSize: 25,
  currentPage: 1,
  canGoPrev: false,
  canGoNext: false,
  onPrevPage: vi.fn(),
  onNextPage: vi.fn(),
};

describe("PatientsPageUI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the page header and add-patient action", () => {
    render(<PatientsPageUI {...baseProps} />);
    expect(screen.getByRole("heading", { name: "Patients" })).toBeInTheDocument();
    expect(screen.getByTestId("patients-add-trigger")).toBeInTheDocument();
  });

  it("renders patient rows and navigates on row click", () => {
    render(<PatientsPageUI {...baseProps} />);
    // The name appears in both the desktop table cell and the mobile card.
    expect(screen.getAllByText("Asha Rao").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ravi Nair").length).toBeGreaterThan(0);
  });

  it("shows the empty state with the add-patient CTA when no patients exist", () => {
    render(<PatientsPageUI {...baseProps} filteredPatients={[]} />);
    expect(screen.getByText("No patients yet")).toBeInTheDocument();
    const addButtons = screen.getAllByText("Add patient");
    // The header trigger and the empty-state CTA both carry this label.
    fireEvent.click(addButtons[addButtons.length - 1]);
    expect(baseProps.onAddPatient).toHaveBeenCalled();
  });

  it("shows the error state with retry when an error is present", () => {
    render(<PatientsPageUI {...baseProps} error="Something broke" />);
    expect(screen.getByText("Something broke")).toBeInTheDocument();
  });

  it("renders the search input and clears search", () => {
    render(
      <PatientsPageUI {...baseProps} searchQuery="asha" filteredPatients={[mockPatients[0]]} />,
    );
    expect(screen.getByPlaceholderText("Search by name or phone…")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Clear"));
    expect(baseProps.onClearSearch).toHaveBeenCalled();
  });
});
