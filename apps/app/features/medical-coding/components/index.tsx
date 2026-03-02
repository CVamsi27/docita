"use client";

import { FC } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Input } from "@workspace/ui/components/input";
import { BookOpen, CheckCircle2, FileText, Search } from "lucide-react";

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
            <CardTitle>Medical Coding</CardTitle>
            <CardDescription>
              Search ICD-10, CPT, and other codes
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by code or description..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-10"
          />
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
  }>;
}> = ({ items = [] }) => {
  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Coding Queue</CardTitle>
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
                  <p className="text-sm text-muted-foreground">{item.date}</p>
                </div>
                <Button size="sm">Review</Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
