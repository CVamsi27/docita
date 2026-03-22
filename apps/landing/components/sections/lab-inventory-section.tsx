"use client";

import { FlaskConical, Package } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export function LabInventorySection() {
  return (
    <section className="px-6 py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full badge-info px-4 py-2 text-sm mb-4">
              <FlaskConical className="h-4 w-4 text-info" />
              <span className="font-medium text-info">
                Lab & Inventory
              </span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Complete Clinic Operations
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              Manage your in-house lab tests and pharmacy inventory in one
              place. Track stock levels, expiry dates, and test results
              effortlessly.
            </p>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="shrink-0">
                  <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                    <FlaskConical className="h-5 w-5 text-info" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Lab Management</h3>
                  <p className="text-sm text-muted-foreground">
                    Order tests, track sample status, and deliver digital
                    reports directly to patients.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="shrink-0">
                  <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                    <Package className="h-5 w-5 text-warning" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Smart Inventory</h3>
                  <p className="text-sm text-muted-foreground">
                    Track medicine stock, get low-inventory alerts, and manage
                    supplier orders.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="grid gap-4">
              <Card className="bg-background/60 backdrop-blur-sm border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Lab Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      {
                        test: "Complete Blood Count",
                        status: "Completed",
                        color: "badge-success",
                      },
                      {
                        test: "Lipid Profile",
                        status: "Processing",
                        color: "badge-info",
                      },
                      {
                        test: "Thyroid Function",
                        status: "Sample Collected",
                        color: "badge-warning",
                      },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="font-medium">{item.test}</span>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${item.color}`}
                        >
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-background/60 backdrop-blur-sm border-border ml-8">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Low Stock Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      {
                        item: "Paracetamol 500mg",
                        stock: "45 strips",
                        status: "Low",
                      },
                      {
                        item: "Amoxicillin 250mg",
                        stock: "12 strips",
                        status: "Critical",
                      },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="font-medium">{item.item}</span>
                        <div className="text-right">
                          <div className="text-xs font-medium text-destructive">
                            {item.status}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.stock}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
