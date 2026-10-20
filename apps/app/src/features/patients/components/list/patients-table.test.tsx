import { fireEvent, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { patientSchema } from "@workspace/types";
import { render } from "@/test-utils";
import { PatientsTable } from "./patients-table";

const patient = patientSchema.parse({
  id: "patient-fixture",
  clinicId: "clinic-fixture",
  firstName: "Synthetic",
  lastName: "Patient",
  phoneNumber: "9876543210",
  gender: "MALE",
  dateOfBirth: "1990-01-01",
});

it.each(["asc", "desc"] as const)(
  "announces %s patient sorting on the column header, and preserves its action",
  (direction) => {
    const onSort = vi.fn();
    render(
      <PatientsTable
        isLoading={false}
        searchQuery=""
        sortConfig={{ key: "fullName", direction }}
        filteredPatients={[patient]}
        onSort={onSort}
        onViewPatient={vi.fn()}
        onSchedulePatient={vi.fn()}
        onEditPatient={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("columnheader", { name: "Patient" }),
    ).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Sort by Name" });
    expect(button).not.toHaveAttribute("aria-sort");
    expect(button.closest("th")).toHaveAttribute(
      "aria-sort",
      direction === "asc" ? "ascending" : "descending",
    );
    fireEvent.click(button);
    expect(onSort).toHaveBeenCalledWith("fullName");
  },
);
