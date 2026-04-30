"use client";

export function DataProcessingAgreementContent() {
  return (
    <div className="rounded-lg border bg-background p-4 md:p-5">
      <div className="prose prose-sm dark:prose-invert max-w-none [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-normal [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:leading-7 [&_p]:text-sm [&_p]:leading-6 [&_ol]:my-4 [&_ol]:space-y-6 [&_ol]:pl-6 [&_ul]:my-3 [&_ul]:space-y-2 [&_ul]:pl-5 [&_li]:pl-1 [&_li]:text-sm [&_li]:leading-6">
        <h2>Data Processing Agreement (DPDP Compliant)</h2>
        <p className="text-muted-foreground">Last Updated: March 7, 2026</p>

        <ol>
          <li>
            <h3 className="mt-0 mb-2">1. Parties and Scope</h3>
            <p>
              This Data Processing Agreement governs how Docita processes personal
              and health data on behalf of your clinic to provide healthcare
              workflow, communication, and operational software services.
            </p>
          </li>

          <li>
            <h3 className="mt-0 mb-2">2. Data Categories</h3>
            <ul>
              <li>Clinic account and operator profile information</li>
              <li>Patient identifiers and contact details</li>
              <li>Clinical records, prescriptions, and appointment data</li>
              <li>Communication and consent logs</li>
            </ul>
          </li>

          <li>
            <h3 className="mt-0 mb-2">3. Processing Purpose</h3>
            <ul>
              <li>Treatment and consultation support</li>
              <li>Billing, invoicing, and practice operations</li>
              <li>Patient communication for healthcare-related notifications</li>
              <li>Regulatory compliance, auditability, and security monitoring</li>
            </ul>
          </li>

          <li>
            <h3 className="mt-0 mb-2">4. Security and Confidentiality</h3>
            <ul>
              <li>Encryption in transit and at rest</li>
              <li>Role-based and tenant-scoped access controls</li>
              <li>Comprehensive audit trails for sensitive actions</li>
              <li>Incident detection and response procedures</li>
            </ul>
          </li>

          <li>
            <h3 className="mt-0 mb-2">5. Sub-processors and Hosting</h3>
            <p>
              Docita uses vetted infrastructure and service providers only where
              necessary to deliver platform services, under contractual safeguards
              and access limitations.
            </p>
          </li>

          <li>
            <h3 className="mt-0 mb-2">6. Data Subject Rights</h3>
            <p>
              The clinic remains responsible for validating and actioning data
              subject requests. Docita provides technical support for access,
              correction, export, and deletion workflows, subject to legal
              retention obligations.
            </p>
          </li>

          <li>
            <h3 className="mt-0 mb-2">7. Retention and Deletion</h3>
            <p>
              Data is retained for active service obligations and legal compliance
              windows, and is deleted or anonymized according to retention policy
              once no longer required.
            </p>
          </li>
        </ol>
      </div>
    </div>
  );
}
