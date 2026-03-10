"use client";

import { ScrollArea } from "@workspace/ui/components/scroll-area";

export function DataProcessingAgreementContent() {
  return (
    <ScrollArea className="h-[400px] rounded-md border p-4">
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <h2>Data Processing Agreement (DPDP Compliant)</h2>
        <p className="text-muted-foreground">Last Updated: March 7, 2026</p>

        <h3>1. Parties and Scope</h3>
        <p>
          This Data Processing Agreement governs how Docita processes personal
          and health data on behalf of your clinic to provide healthcare
          workflow, communication, and operational software services.
        </p>

        <h3>2. Data Categories</h3>
        <ul>
          <li>Clinic account and operator profile information</li>
          <li>Patient identifiers and contact details</li>
          <li>Clinical records, prescriptions, and appointment data</li>
          <li>Communication and consent logs</li>
        </ul>

        <h3>3. Processing Purpose</h3>
        <ul>
          <li>Treatment and consultation support</li>
          <li>Billing, invoicing, and practice operations</li>
          <li>Patient communication for healthcare-related notifications</li>
          <li>Regulatory compliance, auditability, and security monitoring</li>
        </ul>

        <h3>4. Security and Confidentiality</h3>
        <ul>
          <li>Encryption in transit and at rest</li>
          <li>Role-based and tenant-scoped access controls</li>
          <li>Comprehensive audit trails for sensitive actions</li>
          <li>Incident detection and response procedures</li>
        </ul>

        <h3>5. Sub-processors and Hosting</h3>
        <p>
          Docita uses vetted infrastructure and service providers only where
          necessary to deliver platform services, under contractual safeguards
          and access limitations.
        </p>

        <h3>6. Data Subject Rights</h3>
        <p>
          The clinic remains responsible for validating and actioning data
          subject requests. Docita provides technical support for access,
          correction, export, and deletion workflows, subject to legal
          retention obligations.
        </p>

        <h3>7. Retention and Deletion</h3>
        <p>
          Data is retained for active service obligations and legal compliance
          windows, and is deleted or anonymized according to retention policy
          once no longer required.
        </p>
      </div>
    </ScrollArea>
  );
}
