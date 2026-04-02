"use client";

export function PrivacyPolicyContent() {
  return (
    <div className="rounded-xl border bg-background p-4 md:p-5">
      <div className="prose prose-sm dark:prose-invert max-w-none [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:leading-7 [&_p]:text-sm [&_p]:leading-6 [&_ol]:my-4 [&_ol]:space-y-6 [&_ol]:pl-6 [&_ul]:my-3 [&_ul]:space-y-2 [&_ul]:pl-5 [&_li]:pl-1 [&_li]:text-sm [&_li]:leading-6">
        <h2>Privacy Policy</h2>
        <p className="text-muted-foreground">Last Updated: January 1, 2026</p>

        <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 my-4">
          <h3 className="text-primary mt-0">
            Compliance Notice: DPDP Act 2023
          </h3>
          <p className="text-sm mb-0">
            This policy adheres to the Digital Personal Data Protection Act,
            2023 (India). We act as a <strong>Data Processor</strong> for
            clinics and a <strong>Data Fiduciary</strong> for direct account
            information.
          </p>
        </div>

        <ol>
          <li>
            <h3 className="mt-0 mb-2">1. Information We Collect</h3>
            <p>We collect the following categories of information:</p>
            <ul>
              <li>
                <strong>Account Information:</strong> Name, email, phone number,
                clinic details
              </li>
              <li>
                <strong>Patient Data:</strong> Medical records, prescriptions,
                consultation notes (processed on your behalf)
              </li>
              <li>
                <strong>Usage Data:</strong> Feature usage, login times, device
                information
              </li>
              <li>
                <strong>Payment Information:</strong> Billing details, transaction
                history
              </li>
            </ul>
          </li>

          <li>
            <h3 className="mt-0 mb-2">2. Itemized Consent & Purpose</h3>
            <p>In accordance with the DPDP Act, we seek specific consent for:</p>
            <ul>
              <li>
                <strong>Medical Management:</strong> Processing health records for
                consultations and treatment.
              </li>
              <li>
                <strong>Communication:</strong> Sending appointment reminders via
                SMS, Email, or WhatsApp.
              </li>
              <li>
                <strong>Data Storage:</strong> Securely storing records on AWS
                servers within India.
              </li>
            </ul>
          </li>

          <li>
            <h3 className="mt-0 mb-2">3. Your Rights (DPDP Act)</h3>
            <p>Under the DPDP Act, you have the right to:</p>
            <ul>
              <li>Access a summary of your personal data processed by us</li>
              <li>Correct inaccurate or misleading personal data</li>
              <li>Withdraw consent at any time via profile settings</li>
              <li>Request erasure of data (Right to be Forgotten)</li>
              <li>
                Nominate a representative to exercise rights in case of
                death/incapacity
              </li>
              <li>Lodge grievances with our Data Protection Officer</li>
            </ul>
          </li>

          <li>
            <h3 className="mt-0 mb-2">4. Data Retention</h3>
            <ul>
              <li>Active clinic data: Retained while account is active</li>
              <li>Inactive accounts: Data deleted after 2 years of inactivity</li>
              <li>
                Medical records: Retained for <strong>3 years</strong> as per
                Clinical Establishments Rules (and anonymized thereafter)
              </li>
              <li>Backup data: Deleted 30 days after primary deletion</li>
            </ul>
          </li>

          <li>
            <h3 className="mt-0 mb-2">5. Data Localization & Security</h3>
            <p>
              All personal and health data is stored exclusively on secure servers
              located within <strong>India</strong>. We use AES-256 encryption for
              data at rest and TLS 1.2+ for data in transit.
            </p>
          </li>

          <li>
            <h3 className="mt-0 mb-2">6. Data Sharing</h3>
            <p>We do not sell your data. We may share data with:</p>
            <ul>
              <li>Cloud infrastructure providers (AWS Mumbai Region)</li>
              <li>Payment processors (for billing)</li>
              <li>Government authorities (when legally required)</li>
            </ul>
          </li>

          <li>
            <h3 className="mt-0 mb-2">7. Grievance Redressal</h3>
            <p>
              For any privacy-related grievances or to exercise your rights, please
              contact our Data Protection Officer (DPO):
            </p>
            <div className="bg-muted p-3 rounded-md text-sm">
              <strong>Data Protection Officer</strong>
              <br />
              Email: <a href="mailto:admin@docita.work">admin@docita.work</a>
              <br />
              Address: Docita HQ, Hyderabad, India
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
}
