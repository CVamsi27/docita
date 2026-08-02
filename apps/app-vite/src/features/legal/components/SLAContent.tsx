export function SLAContent() {
  return (
    <div className="rounded-lg border bg-background p-4 md:p-5">
      <div className="prose prose-sm dark:prose-invert max-w-none [&_h2]:text-[var(--fs-2xl)] [&_h2]:font-semibold [&_h2]:leading-[var(--lh-tight)] [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:leading-7 [&_p]:text-sm [&_p]:leading-6 [&_ol]:my-4 [&_ol]:space-y-6 [&_ol]:pl-6 [&_ul]:my-3 [&_ul]:space-y-2 [&_ul]:pl-5 [&_li]:pl-1 [&_li]:text-sm [&_li]:leading-6 [&_table]:my-3 [&_th]:text-xs [&_td]:text-sm">
        <h2>Service Level Agreement</h2>
        <p className="text-muted-foreground">Effective Date: January 1, 2025</p>
        <ol>
          <li>
            <h3 className="mt-0 mb-2">1. Service Availability</h3>
            <p>Docita commits to maintaining <strong>99.9% uptime</strong> for all core services, measured on a monthly basis. Scheduled maintenance windows will be communicated at least 72 hours in advance.</p>
          </li>
          <li>
            <h3 className="mt-0 mb-2">2. Support Response Times</h3>
            <div className="overflow-x-auto overscroll-x-contain">
              <table className="min-w-[32rem] w-full border-collapse"><thead><tr className="border-b"><th className="text-left text-xs font-medium p-2">Priority</th><th className="text-left text-xs font-medium p-2">Response time</th><th className="text-left text-xs font-medium p-2">Resolution target</th></tr></thead>
                <tbody>
                  <tr className="border-b"><td className="p-2 text-sm">Critical (P1)</td><td className="p-2 text-sm">1 hour</td><td className="p-2 text-sm">4 hours</td></tr>
                  <tr className="border-b"><td className="p-2 text-sm">High (P2)</td><td className="p-2 text-sm">4 hours</td><td className="p-2 text-sm">24 hours</td></tr>
                  <tr className="border-b"><td className="p-2 text-sm">Medium (P3)</td><td className="p-2 text-sm">1 business day</td><td className="p-2 text-sm">3 business days</td></tr>
                  <tr className="border-b"><td className="p-2 text-sm">Low (P4)</td><td className="p-2 text-sm">2 business days</td><td className="p-2 text-sm">7 business days</td></tr>
                </tbody>
              </table>
            </div>
          </li>
          <li>
            <h3 className="mt-0 mb-2">3. Data Protection</h3>
            <ul>
              <li>All data encrypted at rest using AES-256</li>
              <li>All data encrypted in transit using TLS 1.3</li>
              <li>Daily automated backups with 30-day retention</li>
              <li>Point-in-time recovery available for 7 days</li>
              <li>Data centers located in India (Mumbai region)</li>
            </ul>
          </li>
          <li>
            <h3 className="mt-0 mb-2">4. Compliance</h3>
            <ul>
              <li>DPDP-aware privacy and consent controls</li>
              <li>India-hosted backend infrastructure (Mumbai region)</li>
              <li>Role-based access and audit logging for sensitive workflows</li>
            </ul>
          </li>
          <li>
            <h3 className="mt-0 mb-2">5. Service Credits</h3>
            <ul>
              <li>99.0% - 99.9% uptime: 10% service credit</li>
              <li>95.0% - 99.0% uptime: 25% service credit</li>
              <li>Below 95.0% uptime: 50% service credit</li>
            </ul>
          </li>
          <li>
            <h3 className="mt-0 mb-2">6. Exclusions</h3>
            <p>SLA commitments do not apply during force majeure events, scheduled maintenance, or issues caused by third-party integrations outside our control.</p>
          </li>
        </ol>
      </div>
    </div>
  );
}
