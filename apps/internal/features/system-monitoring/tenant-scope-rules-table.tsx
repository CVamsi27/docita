"use client";

import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";

interface ScopeRule {
  model: string;
  kind: string;
  path?: string[];
}

interface TenantScopeRulesTableProps {
  rules: ScopeRule[];
  statusBadge: React.ReactNode;
  statusLabel: string;
}

export function TenantScopeRulesTable({
  rules,
  statusBadge,
  statusLabel,
}: TenantScopeRulesTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Tenant Scope Rules</CardTitle>
            <CardDescription>{statusLabel}</CardDescription>
          </div>
          {statusBadge}
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-[520px] overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Path</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.model}>
                  <TableCell className="font-medium">{rule.model}</TableCell>
                  <TableCell>
                    <Badge
                      variant={rule.kind === "direct" ? "secondary" : "outline"}
                    >
                      {rule.kind}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {rule.path?.join(" -> ") ?? "clinicId"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
