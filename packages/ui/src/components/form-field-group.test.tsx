import { render, screen } from "@testing-library/react";
import { FormFieldGroup } from "./form-field-group";
import { describe, expect, it } from "vitest";

describe("FormFieldGroup", () => {
  it("renders label when provided", () => {
    render(
      <FormFieldGroup label="Email Address">
        <input type="email" />
      </FormFieldGroup>
    );

    expect(screen.getByText("Email Address")).toBeInTheDocument();
  });

  it("shows required indicator when required is true", () => {
    render(
      <FormFieldGroup label="Password" required>
        <input type="password" />
      </FormFieldGroup>
    );

    const label = screen.getByText("Password");
    expect(label).toHaveClass("after:content-['_*']");
  });

  it("displays error message when error prop is provided", () => {
    render(
      <FormFieldGroup label="Username" error="Username is required">
        <input type="text" />
      </FormFieldGroup>
    );

    expect(screen.getByText("Username is required")).toBeInTheDocument();
    expect(screen.getByText("Username is required")).toHaveClass(
      "text-destructive"
    );
  });

  it("displays hint message when hint prop is provided", () => {
    render(
      <FormFieldGroup label="Password" hint="Must be at least 8 characters">
        <input type="password" />
      </FormFieldGroup>
    );

    expect(
      screen.getByText("Must be at least 8 characters")
    ).toBeInTheDocument();
    expect(screen.getByText("Must be at least 8 characters")).toHaveClass(
      "text-muted-foreground"
    );
  });

  it("renders children correctly", () => {
    render(
      <FormFieldGroup label="Test Field">
        <input type="text" placeholder="Enter text" />
      </FormFieldGroup>
    );

    expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
  });
});
