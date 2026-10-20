import { HelmetProvider } from "react-helmet-async";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Button, PageHeader } from "@workspace/ui/components";
import { Feature } from "@workspace/types";
import { render, screen } from "@/test-utils";
import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription/subscription-settings-path";
import { LabTestsPage } from "@/features/lab-tests/pages/lab-tests-page";
import { DocumentsPage } from "@/features/documents/pages/documents-page";
import {
  ClaimDetailPage,
  ClaimEditPage,
  ClaimNewPage,
  ClaimsListPage,
} from "@/features/insurance-claims/pages/claims-page";

const permissions = vi.hoisted(() => ({ canAccess: vi.fn(() => false) }));
vi.mock("@/lib/stores/permission-store", () => ({
  usePermissionStore: () => permissions,
}));

function ProtectedContent({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <Button>Protected action</Button>
      <p>Protected records</p>
    </>
  );
}

vi.mock("@/features/lab-tests/components/layout/lab-tests-page-ui", () => ({
  LabTestsPageUI: () => <ProtectedContent title="Lab Tests" />,
}));
vi.mock("@/features/documents/components/DocumentsPageUI", () => ({
  DocumentsPageUI: () => <ProtectedContent title="Documents" />,
}));
vi.mock("@/features/documents/hooks/use-documents-logic", () => ({
  useDocumentsLogic: () => ({ documents: [], totalDocuments: 0 }),
}));
vi.mock(
  "@/features/insurance-claims/components/list/InsuranceClaimsPageUI",
  () => ({
    InsuranceClaimsPageUI: () => <ProtectedContent title="Insurance Claims" />,
  }),
);
vi.mock(
  "@/features/insurance-claims/components/forms/InsuranceClaimCreateUI",
  () => ({
    InsuranceClaimCreateUI: () => (
      <ProtectedContent title="New Insurance Claim" />
    ),
  }),
);
vi.mock(
  "@/features/insurance-claims/components/forms/InsuranceClaimEditUI",
  () => ({
    InsuranceClaimEditUI: () => (
      <ProtectedContent title="Edit Insurance Claim" />
    ),
  }),
);
vi.mock(
  "@/features/insurance-claims/components/details/InsuranceClaimDetailsUI",
  () => ({
    InsuranceClaimDetailsUI: () => <ProtectedContent title="Insurance Claim" />,
  }),
);

const routes = [
  {
    title: "Lab Tests",
    Component: LabTestsPage,
    feature: Feature.LAB_TESTS,
    planned: false,
  },
  {
    title: "Documents",
    Component: DocumentsPage,
    feature: Feature.DOCUMENT_ARCHIVAL,
    planned: false,
  },
  {
    title: "Insurance Claims",
    Component: ClaimsListPage,
    feature: Feature.INSURANCE_BILLING,
    planned: true,
  },
  {
    title: "New Insurance Claim",
    Component: ClaimNewPage,
    feature: Feature.INSURANCE_BILLING,
    planned: true,
  },
  {
    title: "Insurance Claim",
    Component: ClaimDetailPage,
    feature: Feature.INSURANCE_BILLING,
    planned: true,
  },
  {
    title: "Edit Insurance Claim",
    Component: ClaimEditPage,
    feature: Feature.INSURANCE_BILLING,
    planned: true,
  },
];

describe("Protected route page headings", () => {
  beforeEach(() => {
    permissions.canAccess.mockReset();
    permissions.canAccess.mockReturnValue(false);
  });

  it.each(routes)(
    "preserves $title and the existing locked card when denied",
    ({ title, Component, feature, planned }) => {
      render(
        <HelmetProvider>
          <Component />
        </HelmetProvider>,
      );
      expect(permissions.canAccess).toHaveBeenCalledWith(feature);
      expect(
        screen.getByRole("heading", { name: title, level: 1 }),
      ).toBeVisible();
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
      expect(
        screen.queryByRole("button", { name: "Protected action" }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Protected records")).not.toBeInTheDocument();
      if (planned) {
        expect(screen.getByText("Coming soon", { exact: true })).toBeVisible();
        expect(
          screen.queryByRole("link", { name: /Upgrade to/ }),
        ).not.toBeInTheDocument();
      } else {
        expect(
          screen.getByRole("link", { name: /Upgrade to/ }),
        ).toHaveAttribute("href", SUBSCRIPTION_SETTINGS_PATH);
      }
    },
  );

  it.each(routes)(
    "preserves one content heading for $title when allowed",
    ({ title, Component }) => {
      permissions.canAccess.mockReturnValue(true);
      render(
        <HelmetProvider>
          <Component />
        </HelmetProvider>,
      );
      expect(
        screen.getByRole("heading", { name: title, level: 1 }),
      ).toBeVisible();
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
      expect(
        screen.getByRole("button", { name: "Protected action" }),
      ).toBeVisible();
      expect(screen.getByText("Protected records")).toBeVisible();
      expect(
        screen.queryByRole("link", { name: /Upgrade to/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText("Coming soon", { exact: true }),
      ).not.toBeInTheDocument();
    },
  );
});
