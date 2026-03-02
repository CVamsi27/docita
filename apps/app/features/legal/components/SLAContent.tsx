"use client";

import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

export function SLAContent() {
  return (
    <ScrollArea className="h-[400px] rounded-md border p-4">
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <h2>Service Level Agreement</h2>
        <p className="text-muted-foreground">Effective Date: January 1, 2025</p>

        <h3>1. Service Availability</h3>
        <p>
          Docita commits to maintaining <strong>99.9% uptime</strong> for all
          core services, measured on a monthly basis. Scheduled maintenance
          windows will be communicated at least 72 hours in advance.
        </p>

        <h3>2. Support Response Times</h3>
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

        <h3>3. Data Protection</h3>
        <ul>
          <li>All data encrypted at rest using AES-256</li>
          <li>All data encrypted in transit using TLS 1.3</li>
          <li>Daily automated backups with 30-day retention</li>
          <li>Point-in-time recovery available for 7 days</li>
          <li>Data centers located in India (Mumbai region)</li>
        </ul>

        <h3>4. Compliance</h3>
        <ul>
          <li>DPDP Act 2023 (India) compliant</li>
          <li>HIPAA best practices followed</li>
          <li>ISO 27001 certified infrastructure</li>
          <li>SOC 2 Type II audited</li>
        </ul>

        <h3>5. Service Credits</h3>
        <p>In the event of SLA breach, credits will be applied as follows:</p>
        <ul>
          <li>99.0% - 99.9% uptime: 10% service credit</li>
          <li>95.0% - 99.0% uptime: 25% service credit</li>
          <li>Below 95.0% uptime: 50% service credit</li>
        </ul>

        <h3>6. Exclusions</h3>
        <p>
          SLA commitments do not apply during force majeure events, scheduled
          maintenance, or issues caused by third-party integrations outside our
          control.
        </p>
      </div>
    </ScrollArea>
  );
}
