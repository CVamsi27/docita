"use client";

// jscpd:ignore-start
import { FC } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  SymbolTooltip
} from "@workspace/ui/components";
import { BookOpen, CheckCircle2, FileText, Search, X } from "lucide-react";

export const MedicalCodingSearch: FC<{
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  results?: Array<{ code: string; description: string; category: string }>;
}> = ({ searchQuery = "", onSearchChange, results = [] }) => {
  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Medical coding</CardTitle>
            <CardDescription>
              Search ICD-10, CPT, and other codes
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            placeholder="Enter code or description"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className={searchQuery.trim() ? "pl-10 pr-10" : "pl-10"}
            aria-label="Search medical codes"
          />
          {searchQuery.trim() ? (
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
              <SymbolTooltip label="Clear search">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onSearchChange?.("")}
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4 text-muted-foreground" aria-hidden />
{/* jscpd:ignore-end */}
                </Button>
              </SymbolTooltip>
            </div>
          ) : null}
        </div>
        {results.length > 0 ? (
          <div className="space-y-2">
            {results.map((result, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono">
                    {result.code}
                  </Badge>
                  <span className="text-sm">{result.description}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {result.category}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Search for diagnosis or procedure codes
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export const CodingQueue: FC<{
  items?: Array<{
    id: string;
    patientName: string;
    date: string;
    status: string;
    reviewHref?: string;
  }>;
}> = ({ items = [] }) => {
  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Coding queue</CardTitle>
          </div>
          <Badge>{items.length} pending</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mb-2 text-success" />
            <p>All caught up!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50"
              >
                <div>
                  <p className="font-medium">{item.patientName}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.date} - {item.status}
                  </p>
                </div>
                {item.reviewHref ? (
                  <Button size="sm" asChild>
                    <Link href={item.reviewHref}>Review</Link>
                  </Button>
                ) : (
                  <Button size="sm" disabled>
                    Review
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
