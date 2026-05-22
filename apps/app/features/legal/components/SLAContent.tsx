"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";

export function SLAContent() {
  return (
    <div className="rounded-lg border bg-background p-4 md:p-5">
      <div className="prose prose-sm dark:prose-invert max-w-none [&_h2]:text-[var(--fs-2xl)] [&_h2]:font-semibold [&_h2]:leading-[var(--lh-tight)] [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:leading-7 [&_p]:text-sm [&_p]:leading-6 [&_ol]:my-4 [&_ol]:space-y-6 [&_ol]:pl-6 [&_ul]:my-3 [&_ul]:space-y-2 [&_ul]:pl-5 [&_li]:pl-1 [&_li]:text-sm [&_li]:leading-6 [&_table]:my-3 [&_th]:text-xs [&_td]:text-sm">
        <h2>Service Level Agreement</h2>
        <p className="text-muted-foreground">Effective Date: January 1, 2025</p>

        <ol>
          <li>
            <h3 className="mt-0 mb-2">1. Service Availability</h3>
            <p>
              Docita commits to maintaining <strong>99.9% uptime</strong> for all
              core services, measured on a monthly basis. Scheduled maintenance
              windows will be communicated at least 72 hours in advance.
            </p>
          </li>

          <li>
            <h3 className="mt-0 mb-2">2. Support Response Times</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Priority</TableHead>
                  <TableHead>Response Time</TableHead>
                  <TableHead>Resolution Target</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Critical (P1)</TableCell>
                  <TableCell>1 hour</TableCell>
                  <TableCell>4 hours</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>High (P2)</TableCell>
                  <TableCell>4 hours</TableCell>
                  <TableCell>24 hours</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Medium (P3)</TableCell>
                  <TableCell>1 business day</TableCell>
                  <TableCell>3 business days</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Low (P4)</TableCell>
                  <TableCell>2 business days</TableCell>
                  <TableCell>7 business days</TableCell>
                </TableRow>
              </TableBody>
            </Table>
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
              <li>Formal certifications are not claimed here unless separately documented</li>
            </ul>
          </li>

          <li>
            <h3 className="mt-0 mb-2">5. Service Credits</h3>
            <p>In the event of SLA breach, credits will be applied per the table below:</p>
            <ul>
              <li>99.0% - 99.9% uptime: 10% service credit</li>
              <li>95.0% - 99.0% uptime: 25% service credit</li>
              <li>Below 95.0% uptime: 50% service credit</li>
            </ul>
          </li>

          <li>
            <h3 className="mt-0 mb-2">6. Exclusions</h3>
            <p>
              SLA commitments do not apply during force majeure events, scheduled
              maintenance, or issues caused by third-party integrations outside our
              control.
            </p>
          </li>
        </ol>
      </div>
    </div>
  );
}
