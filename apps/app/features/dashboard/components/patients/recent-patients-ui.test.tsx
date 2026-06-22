import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RecentPatientsUI, type RecentPatient } from "./recent-patients-ui";

describe("RecentPatientsUI", () => {
  it("shows the empty state with an add-patient action when there are no patients", () => {
    render(<RecentPatientsUI patients={[]} />);
    expect(screen.getByText("No patients yet")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Add patient/i }),
    ).toHaveAttribute("href", "/patients?action=new");
  });

  it("renders a patient linking to their detail page", () => {
    const patients: RecentPatient[] = [
      {
        id: "p1",
        firstName: "Asha",
        lastName: "Rao",
        updatedAt: new Date().toISOString(),
      },
    ];
    render(<RecentPatientsUI patients={patients} />);
    expect(screen.getByText("Asha Rao")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Asha Rao/i }),
    ).toHaveAttribute("href", "/patients/p1");
  });

  it("caps the visible list at four patients", () => {
    const patients: RecentPatient[] = Array.from({ length: 6 }, (_, i) => ({
      id: `p${i}`,
      firstName: `First${i}`,
      lastName: "Patient",
    }));
    render(<RecentPatientsUI patients={patients} />);
    expect(screen.getByText("First0 Patient")).toBeInTheDocument();
    expect(screen.getByText("First3 Patient")).toBeInTheDocument();
    expect(screen.queryByText("First4 Patient")).not.toBeInTheDocument();
  });
});
