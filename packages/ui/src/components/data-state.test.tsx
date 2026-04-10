import { render, screen } from "@testing-library/react";
import { Calendar } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { DataState } from "./data-state";
import {
  Form,
  FormField,
  FormItem,
  FormMessage,
} from "./form";

function FormMessageFixture({ message }: { message: string }) {
  const form = useForm<{ name: string }>({
    defaultValues: { name: "" },
  });

  useEffect(() => {
    form.setError("name", { type: "manual", message });
  }, [form, message]);

  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="name"
        render={() => (
          <FormItem>
            <FormMessage />
          </FormItem>
        )}
      />
    </Form>
  );
}

describe("DataState", () => {
  it("renders loading state", () => {
    render(<DataState status="loading" loadingMessage="Loading patients..." />);
    expect(screen.getByText("Loading patients...")).toBeInTheDocument();
  });

  it("renders error state with retry action", () => {
    const onRetry = vi.fn();
    render(
      <DataState
        status="error"
        errorMessage="Unable to fetch records"
        onRetry={onRetry}
      />,
    );

    expect(
      screen.getByText("We could not fetch records. Please try again."),
    ).toBeInTheDocument();
    screen.getByRole("button", { name: "Try again" }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("polishes rough error copy before rendering", () => {
    render(
      <DataState
        status="error"
        errorMessage="Failed to load appointments"
      />,
    );

    expect(
      screen.getByText("We could not load appointments. Please try again."),
    ).toBeInTheDocument();
  });

  it("hides technical error details before rendering", () => {
    render(
      <DataState
        status="error"
        errorMessage="PrismaClientKnownRequestError: HTTP 500 response validation failed"
      />,
    );

    expect(
      screen.getByText("Something went wrong. Please try again."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Prisma/i)).not.toBeInTheDocument();
  });

  it("downgrades technical field errors", async () => {
    render(
      <FormMessageFixture message="Response validation failed: HTTP 500" />,
    );

    expect(await screen.findByText("Please check this field.")).toBeInTheDocument();
    expect(screen.queryByText(/HTTP 500/i)).not.toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(
      <DataState
        status="empty"
        emptyIcon={Calendar}
        emptyTitle="No appointments found"
        emptyDescription="Appointments will appear here."
      />,
    );

    expect(screen.getByText("No appointments found")).toBeInTheDocument();
    expect(screen.getByText("Appointments will appear here.")).toBeInTheDocument();
  });

  it("renders success children", () => {
    render(
      <DataState status="success">
        <div>Loaded content</div>
      </DataState>,
    );

    expect(screen.getByText("Loaded content")).toBeInTheDocument();
  });
});
