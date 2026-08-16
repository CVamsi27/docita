import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PartnerSubmitLeadForm } from "./PartnerSubmitLeadForm";

const { signOutMock, navigateMock, submitLeadMock } = vi.hoisted(() => ({
  signOutMock: vi.fn(),
  navigateMock: vi.fn(),
  submitLeadMock: vi.fn(),
}));

vi.mock("@/features/referral-partner/hooks/use-partner-auth", () => ({
  usePartnerAuth: () => ({
    buildContext: () => ({
      accessToken: "tok_123",
      baseUrl: "https://api.test",
    }),
    signOut: signOutMock,
  }),
}));

vi.mock("@workspace/data-access", () => ({
  useSubmitFacilityLead: () => ({
    mutateAsync: submitLeadMock,
    isPending: false,
  }),
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const leadView = (overrides: Record<string, unknown> = {}) => ({
  id: "lead-1",
  referrerId: "r1",
  referrerName: "Alice Partner",
  status: "SUBMITTED",
  facilityName: "Sunrise Diagnostics",
  facilityType: "DIAGNOSTIC_CENTRE",
  address: "12 MG Road",
  city: "Bengaluru",
  state: "Karnataka",
  postalCode: "560001",
  contactName: "Dr Anil",
  contactPhone: "+919812345678",
  contactEmail: null,
  consentToFollowUp: true,
  createdAt: "2026-08-16T10:00:00Z",
  updatedAt: "2026-08-16T10:00:00Z",
  ...overrides,
});

async function fillRequiredFields() {
  fireEvent.change(screen.getByPlaceholderText("Enter facility name"), {
    target: { value: "Sunrise Diagnostics" },
  });
  fireEvent.click(screen.getByLabelText("Facility type"));
  fireEvent.click(await screen.findByRole("option", { name: "Diagnostic centre" }));
  fireEvent.change(screen.getByPlaceholderText("Enter street address"), {
    target: { value: "12 MG Road" },
  });
  fireEvent.change(screen.getByPlaceholderText("Enter city"), {
    target: { value: "Bengaluru" },
  });
  fireEvent.change(screen.getByPlaceholderText("Enter the contact person's name"), {
    target: { value: "Dr Anil" },
  });
}

describe("PartnerSubmitLeadForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the submission form with the consent attestation", () => {
    render(<PartnerSubmitLeadForm />);
    expect(screen.getByText("Submit a facility lead")).toBeInTheDocument();
    expect(
      screen.getByText(
        "The facility contact has agreed to be contacted by Docita about our services.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit lead" })).toBeEnabled();
  });

  it("requires the consent attestation before submitting", async () => {
    render(<PartnerSubmitLeadForm />);
    await fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "Submit lead" }));
    // FormMessage passes the message through sanitizeUserFacingMessage,
    // which trims trailing punctuation — match the substring.
    await waitFor(() => {
      expect(
        screen.getByText(/Please confirm the facility contact agreed to be contacted/),
      ).toBeInTheDocument();
    });
    expect(submitLeadMock).not.toHaveBeenCalled();
  });

  it("posts the lead with a client idempotency key and shows the success panel", async () => {
    submitLeadMock.mockResolvedValueOnce(leadView());
    render(<PartnerSubmitLeadForm />);
    await fillRequiredFields();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Submit lead" }));

    await waitFor(() => {
      expect(submitLeadMock).toHaveBeenCalledWith(
        expect.objectContaining({
          facilityName: "Sunrise Diagnostics",
          facilityType: "DIAGNOSTIC_CENTRE",
          city: "Bengaluru",
          contactName: "Dr Anil",
          consentToFollowUp: true,
          idempotencyKey: expect.any(String),
        }),
      );
    });
    await waitFor(() => {
      expect(screen.getByText("Lead submitted")).toBeInTheDocument();
    });
    expect(
      screen.getByText("Thank you! Our team will follow up with Sunrise Diagnostics shortly."),
    ).toBeInTheDocument();

    // "Submit another facility" returns to the empty form.
    fireEvent.click(screen.getByRole("button", { name: "Submit another facility" }));
    expect(screen.getByText("Submit a facility lead")).toBeInTheDocument();
  });

  it("surfaces the DUPLICATE_REVIEW outcome without blocking the partner", async () => {
    submitLeadMock.mockResolvedValueOnce(
      leadView({ status: "DUPLICATE_REVIEW" }),
    );
    render(<PartnerSubmitLeadForm />);
    await fillRequiredFields();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Submit lead" }));

    await waitFor(() => {
      expect(screen.getByText("Already under review")).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        "A lead for this facility has already been submitted and is under review. No further action is needed from you.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the DUPLICATE_ENTRY conflict message on a 409", async () => {
    submitLeadMock.mockRejectedValueOnce(
      Object.assign(new Error("A lead for this facility contact already exists"), {
        status: 409,
        code: "DUPLICATE_ENTRY",
      }),
    );
    render(<PartnerSubmitLeadForm />);
    await fillRequiredFields();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Submit lead" }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "A lead for this facility contact already exists. We'll reach out if needed — please don't submit the same facility twice.",
        ),
      ).toBeInTheDocument();
    });
    // The form stays editable so the partner can correct and resubmit.
    expect(screen.getByText("Submit a facility lead")).toBeInTheDocument();
  });

  it("signs out and returns to login on a 401 (deactivated or expired session)", async () => {
    submitLeadMock.mockRejectedValueOnce(
      Object.assign(new Error("Invalid or expired access token"), {
        status: 401,
        code: "UNAUTHORIZED",
      }),
    );
    render(<PartnerSubmitLeadForm />);
    await fillRequiredFields();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Submit lead" }));

    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalled();
    });
    expect(navigateMock).toHaveBeenCalledWith("/partner/login", {
      replace: true,
    });
  });
});
