import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UsersPageContainer } from "./users-page-container";

const usersDataMocks = vi.hoisted(() => ({
  setSearchTerm: vi.fn(),
  setSelectedClinic: vi.fn(),
  setSelectedRole: vi.fn(),
  setIsViewOpen: vi.fn(),
  handleViewUser: vi.fn(),
  retry: vi.fn(),
  state: {
    clinics: [{ id: "clinic_1", name: "Care Clinic" }],
    users: [] as unknown[],
    filteredUsers: [] as unknown[],
    roleStats: {
      ALL: 0,
      ADMIN: 0,
      ADMIN_DOCTOR: 0,
      DOCTOR: 0,
      RECEPTIONIST: 0,
    },
    loading: false,
    hasError: false,
    errorMessage: "",
    searchTerm: "",
    selectedClinic: "all",
    selectedRole: "ALL",
    selectedUser: null as unknown,
    isViewOpen: false,
  },
}));

vi.mock("./use-users-data", () => ({
  useUsersData: () => ({
    ...usersDataMocks.state,
    setSearchTerm: usersDataMocks.setSearchTerm,
    setSelectedClinic: usersDataMocks.setSelectedClinic,
    setSelectedRole: usersDataMocks.setSelectedRole,
    setIsViewOpen: usersDataMocks.setIsViewOpen,
    handleViewUser: usersDataMocks.handleViewUser,
    retry: usersDataMocks.retry,
  }),
}));

const doctor = {
  id: "user_1",
  name: "Dr. Asha Rao",
  email: "asha@example.com",
  phoneNumber: "+919000000000",
  role: "DOCTOR",
  specialization: "CARDIOLOGY",
  qualification: "MD",
  registrationNumber: "MCI-123",
  yearsOfExperience: 12,
  bio: "Cardiology consultant.",
  createdAt: "2026-04-01T00:00:00.000Z",
};

describe("UsersPageContainer", () => {
  beforeEach(() => {
    usersDataMocks.setSearchTerm.mockReset();
    usersDataMocks.setSelectedClinic.mockReset();
    usersDataMocks.setSelectedRole.mockReset();
    usersDataMocks.setIsViewOpen.mockReset();
    usersDataMocks.handleViewUser.mockReset();
    usersDataMocks.retry.mockReset();
    usersDataMocks.state = {
      clinics: [{ id: "clinic_1", name: "Care Clinic" }],
      users: [doctor],
      filteredUsers: [doctor],
      roleStats: {
        ALL: 1,
        ADMIN: 0,
        ADMIN_DOCTOR: 0,
        DOCTOR: 1,
        RECEPTIONIST: 0,
      },
      loading: false,
      hasError: false,
      errorMessage: "",
      searchTerm: "",
      selectedClinic: "all",
      selectedRole: "ALL",
      selectedUser: null,
      isViewOpen: false,
    };
  });

  it("filters users and opens the user details action", () => {
    render(<UsersPageContainer />);

    expect(screen.getByText("Team Members (1)")).toBeInTheDocument();
    expect(screen.getByText("Dr. Asha Rao")).toBeInTheDocument();
    expect(screen.getByText("asha@example.com")).toBeInTheDocument();

    fireEvent.change(
      screen.getByPlaceholderText("Enter name, email, or specialization"),
      { target: { value: "cardio" } },
    );
    expect(usersDataMocks.setSearchTerm).toHaveBeenCalledWith("cardio");

    fireEvent.click(screen.getByText("Doctors").closest("div")!);
    expect(usersDataMocks.setSelectedRole).toHaveBeenCalledWith("DOCTOR");

    fireEvent.click(screen.getByRole("button", { name: /View/i }));
    expect(usersDataMocks.handleViewUser).toHaveBeenCalledWith(doctor);
  });

  it("renders the user details modal with professional information", () => {
    usersDataMocks.state.selectedUser = doctor;
    usersDataMocks.state.isViewOpen = true;

    render(<UsersPageContainer />);

    expect(screen.getByText("User Details")).toBeInTheDocument();
    expect(screen.getAllByText("Dr. Asha Rao")).toHaveLength(2);
    expect(screen.getByText("Professional Information")).toBeInTheDocument();
    expect(screen.getAllByText("Cardiology")).toHaveLength(2);
    expect(screen.getByText("MCI-123")).toBeInTheDocument();
    expect(screen.getByText("12 years")).toBeInTheDocument();
  });

  it("shows loading, empty, and error states", () => {
    usersDataMocks.state.loading = true;
    usersDataMocks.state.filteredUsers = [];
    const { rerender } = render(<UsersPageContainer />);
    expect(screen.getByText("Loading team members…")).toBeInTheDocument();

    usersDataMocks.state.loading = false;
    usersDataMocks.state.users = [];
    usersDataMocks.state.filteredUsers = [];
    rerender(<UsersPageContainer />);
    expect(screen.getByText("No team members found")).toBeInTheDocument();

    usersDataMocks.state.hasError = true;
    usersDataMocks.state.errorMessage = "Network unavailable";
    rerender(<UsersPageContainer />);
    expect(screen.getByText("Network unavailable")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(usersDataMocks.retry).toHaveBeenCalled();
  });
});
