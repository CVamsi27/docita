"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { getUserFacingErrorMessage } from "@workspace/types";
import { internalQueryKeys } from "@/lib/query-keys";
import { supportAPI } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Inbox, Mail, MessageSquare, Search } from "lucide-react";

function getReplySubject(inquiry: {
  name: string;
  clinic?: string | null;
}) {
  const clinicSuffix = inquiry.clinic ? ` - ${inquiry.clinic}` : "";
  return `Re: Support inquiry from ${inquiry.name}${clinicSuffix}`;
}

function getReplyBody(inquiry: {
  name: string;
  email: string;
  clinic?: string | null;
  message: string;
}) {
  const clinicLine = inquiry.clinic ? `Clinic: ${inquiry.clinic}\n` : "";
  return encodeURIComponent(
    `Hi ${inquiry.name},\n\nThanks for reaching out to Docita.\n\n${clinicLine}Original message:\n${inquiry.message}\n\nBest regards,\nDocita Support`,
  );
}

export function SupportInboxPage() {
  const { token } = useAuth();
  const [search, setSearch] = useState("");

  const supportQuery = useQuery({
    queryKey: internalQueryKeys.internal.supportInquiries(100),
    queryFn: () => supportAPI.getInquiries(100),
    enabled: Boolean(token),
  });

  const inquiries = useMemo(() => supportQuery.data ?? [], [supportQuery.data]);

  const filteredInquiries = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return inquiries;

    return inquiries.filter((inquiry) => {
      return [inquiry.name, inquiry.email, inquiry.clinic, inquiry.message]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalized));
    });
  }, [inquiries, search]);

  const total = inquiries.length;
  const newCount = inquiries.filter((inquiry) => inquiry.status === "NEW").length;
  const loading = supportQuery.isLoading;
  const errorMessage = supportQuery.isError
    ? getUserFacingErrorMessage(supportQuery.error, {
        context: "load",
        fallback: "We could not load support inquiries right now. Please try again.",
      })
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            <Inbox className="h-3.5 w-3.5" />
            Support Inbox
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Incoming Messages
            </h1>
            <p className="text-sm text-muted-foreground">
              Messages submitted from the public contact form and onboarding support paths.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:min-w-[260px]">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Total
              </p>
              <p className="text-2xl font-bold">{total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                New
              </p>
              <p className="text-2xl font-bold">{newCount}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email, clinic, or message"
            className="pl-10"
          />
        </div>
      </div>

      {loading && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Loading support inquiries...
          </CardContent>
        </Card>
      )}

      {errorMessage && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6 text-sm text-destructive">
            {errorMessage}
          </CardContent>
        </Card>
      )}

      {!loading && !errorMessage && filteredInquiries.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {search.trim()
              ? "No support inquiries matched your search."
              : "No incoming support messages yet."}
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {filteredInquiries.map((inquiry) => {
          const replySubject = getReplySubject(inquiry);
          const replyBody = getReplyBody(inquiry);
          return (
            <Card key={inquiry.id} className="overflow-hidden">
              <CardHeader className="space-y-4 border-b bg-muted/20">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-lg">{inquiry.name}</CardTitle>
                      <Badge
                        variant={inquiry.status === "NEW" ? "default" : "secondary"}
                      >
                        {inquiry.status}
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                      <a
                        href={`mailto:${inquiry.email}`}
                        className="inline-flex items-center gap-2 hover:text-foreground"
                      >
                        <Mail className="h-4 w-4" />
                        {inquiry.email}
                      </a>
                      {inquiry.clinic && <p>Clinic: {inquiry.clinic}</p>}
                      <p>
                        Received{" "}
                        {formatDistanceToNow(new Date(inquiry.createdAt), {
                          addSuffix: true,
                        })}
                        {" "}
                        ({format(new Date(inquiry.createdAt), "PPpp")})
                      </p>
                    </div>
                  </div>

                  <Button asChild variant="outline" size="sm">
                    <a
                      href={`mailto:${inquiry.email}?subject=${encodeURIComponent(
                        replySubject,
                      )}&body=${replyBody}`}
                    >
                      Reply by email
                    </a>
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 p-5">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <MessageSquare className="h-4 w-4" />
                  Message
                </div>
                <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                  {inquiry.message}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
