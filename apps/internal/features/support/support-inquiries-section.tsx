"use client";

// jscpd:ignore-start
import { formatDate, formatDistanceToNow, getUserFacingErrorMessage } from "@workspace/utils";
import { useMemo } from "react";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import {
  Table,
// jscpd:ignore-end
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
import { useInternalSupportInquiries } from "@workspace/data-access/internal";
import type { SupportInquiry } from "@workspace/types";
import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";

const INQUIRIES_LIMIT = 100;

const STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  NEW: "default",
  REVIEWED: "secondary",
  RESOLVED: "outline",
  ARCHIVED: "secondary",
};

/**
 * Phase 3 (per-feature): apps/internal Support > Inquiries section
 * (the public contact form messages table). 7 literals converted to
 * useTranslations("InternalSupport.inquiriesSection").
 */
function useInquiriesTranslations() {
  return useTranslations("InternalSupport.inquiriesSection");
}

export function SupportInquiriesSection() {
  const t = useInquiriesTranslations();
  const inquiriesQuery = useInternalSupportInquiries(INQUIRIES_LIMIT);
  const inquiries = useMemo(
    () => inquiriesQuery.data ?? [],
    [inquiriesQuery.data],
  );

  const errorMessage = inquiriesQuery.isError
    ? getUserFacingErrorMessage(inquiriesQuery.error, {
        context: "load",
        fallback: t("loadErrorFallback"),
      })
    : null;

  const status = inquiriesQuery.isLoading
    ? "loading"
    : errorMessage
      ? "error"
      : inquiries.length === 0
        ? "empty"
        : "success";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <DataState
          status={status}
          loadingMessage={t("loadingLabel")}
          errorMessage={errorMessage ?? undefined}
          onRetry={() => void inquiriesQuery.refetch()}
          emptyTitle={t("emptyTitle")}
          emptyDescription={t("emptyDescription")}
          emptyIcon={Mail}
        >
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colReceived")}</TableHead>
                  <TableHead>{t("colName")}</TableHead>
                  <TableHead>{t("colEmail")}</TableHead>
                  <TableHead>{t("colClinic")}</TableHead>
                  <TableHead>{t("colStatus")}</TableHead>
                  <TableHead>{t("colMessage")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inquiries.map((inquiry: SupportInquiry) => (
                  <TableRow key={inquiry.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      <div>{formatDate(inquiry.createdAt)}</div>
                      <div>{formatDistanceToNow(inquiry.createdAt)}</div>
                    </TableCell>
                    <TableCell className="font-medium">{inquiry.name}</TableCell>
                    <TableCell>{inquiry.email}</TableCell>
                    <TableCell>
                      {inquiry.clinic ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          STATUS_VARIANTS[inquiry.status] ?? "secondary"
                        }
                      >
                        {inquiry.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md text-sm text-muted-foreground">
                      {inquiry.message}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DataState>
      </CardContent>
    </Card>
  );
}
