"use client";

// jscpd:ignore-start
import { AlertCircle, Calendar, LayoutGrid, Plus } from "lucide-react";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { Button } from "@workspace/ui/components/form/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { PageHeader } from "@workspace/ui/components/layout/page-header";

export default function UiContractVisualTestPage() {
// jscpd:ignore-end
  return (
    <div className="space-y-10 p-6 md:p-8">
      <section data-testid="scaffold-and-header">
        <AppPageScaffold
          header={
            <PageHeader
              title="Patient Workspace"
              description="A consistent page scaffold and heading treatment"
              actions={
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                  New Entry
                </Button>
              }
            />
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Today</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                8 appointments scheduled
              </CardContent>
            </Card>
            <Card interaction="interactive">
              <CardHeader>
                <CardTitle>Queue</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                3 patients waiting
              </CardContent>
            </Card>
          </div>
        </AppPageScaffold>
      </section>

      <section data-testid="data-state-loading">
        <Card>
          <CardHeader>
            <CardTitle>Loading State</CardTitle>
          </CardHeader>
          <CardContent>
            <DataState
              status="loading"
              loadingMessage="Loading appointment data…"
            />
          </CardContent>
        </Card>
      </section>

      <section data-testid="data-state-empty">
        <Card>
          <CardHeader>
            <CardTitle>Empty State</CardTitle>
          </CardHeader>
          <CardContent>
            <DataState
              status="empty"
              emptyIcon={Calendar}
              emptyTitle="No appointments found"
              emptyDescription="New appointments will appear here"
              emptyAction={{ label: "Schedule", href: "#" }}
            />
          </CardContent>
        </Card>
      </section>

      <section data-testid="data-state-error">
        <Card>
          <CardHeader>
            <CardTitle>Error State</CardTitle>
          </CardHeader>
          <CardContent>
            <DataState
              status="error"
              errorMessage="We could not load this dashboard view. Please try again."
            />
          </CardContent>
        </Card>
      </section>

      <section data-testid="interactive-card">
        <Card interaction="interactive" className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Interactive Card Variant
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This card uses opt-in interactivity.
          </CardContent>
        </Card>
      </section>

      <section data-testid="error-inline">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            Inline alert style reference
          </p>
        </div>
      </section>
    </div>
  );
}
