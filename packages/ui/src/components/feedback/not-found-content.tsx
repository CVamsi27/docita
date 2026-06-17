"use client";

import type { ReactNode } from "react";
import { FileQuestion } from "lucide-react";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { Card, CardContent } from "@workspace/ui/components/indicators/card";

export interface NotFoundContentProps {
  /** Optional subtitle shown below the 404 heading. */
  subtitle?: string;
  /** Description paragraph below the heading. */
  description?: string;
  /** Primary and secondary action buttons rendered at the bottom. */
  children: ReactNode;
}

const DEFAULT_DESCRIPTION =
  "Sorry, we couldn\u2019t find the page you\u2019re looking for.";

export function NotFoundContent({
  subtitle,
  description = DEFAULT_DESCRIPTION,
  children,
}: NotFoundContentProps) {
  return (
    <AppPageScaffold className="max-w-md">
      <Card className="ui-card-surface">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <FileQuestion className="h-7 w-7 text-muted-foreground" />
          </div>
          <h1 className="ui-page-title">404</h1>
          {subtitle ? (
            <h2 className="ui-section-title mt-2 text-[var(--fs-lg)]">
              {subtitle}
            </h2>
          ) : null}
          <p className="ui-page-subtitle mt-2">{description}</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            {children}
          </div>
        </CardContent>
      </Card>
    </AppPageScaffold>
  );
}
