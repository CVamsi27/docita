"use client";

import { Check, HelpCircle, Minus, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";

type FeatureStatus = "yes" | "no" | "partial" | "na";

interface CompetitorFeature {
  docita: FeatureStatus;
  practo: FeatureStatus;
  paper: FeatureStatus;
  genericEHR: FeatureStatus;
}

interface Feature {
  name: string;
  tooltip?: string;
  comparison: CompetitorFeature;
}

const features: Feature[] = [
  {
    name: "Setup Time",
    comparison: {
      docita: "yes",
      practo: "partial",
      paper: "na",
      genericEHR: "no",
    },
  },
  {
    name: "Mobile App",
    comparison: {
      docita: "yes",
      practo: "yes",
      paper: "no",
      genericEHR: "partial",
    },
  },
  {
    name: "WhatsApp Integration",
    tooltip: "Send prescriptions and reminders via WhatsApp",
    comparison: {
      docita: "yes",
      practo: "no",
      paper: "no",
      genericEHR: "no",
    },
  },
  {
    name: "ICD-10 Medical Coding",
    tooltip: "International Classification of Diseases coding support",
    comparison: {
      docita: "yes",
      practo: "partial",
      paper: "no",
      genericEHR: "partial",
    },
  },
  {
    name: "AI-Powered Suggestions",
    tooltip: "Intelligent diagnosis and prescription recommendations",
    comparison: {
      docita: "yes",
      practo: "no",
      paper: "no",
      genericEHR: "no",
    },
  },
  {
    name: "Queue Management",
    tooltip: "Real-time patient queue with TV display mode",
    comparison: {
      docita: "yes",
      practo: "partial",
      paper: "no",
      genericEHR: "no",
    },
  },
  {
    name: "Prescription Templates",
    comparison: {
      docita: "yes",
      practo: "yes",
      paper: "no",
      genericEHR: "partial",
    },
  },
  {
    name: "Multi-location Support",
    comparison: {
      docita: "yes",
      practo: "yes",
      paper: "no",
      genericEHR: "partial",
    },
  },
  {
    name: "HIPAA Compliant",
    comparison: {
      docita: "yes",
      practo: "yes",
      paper: "no",
      genericEHR: "partial",
    },
  },
  {
    name: "Offline Mode",
    comparison: {
      docita: "partial",
      practo: "no",
      paper: "yes",
      genericEHR: "no",
    },
  },
  {
    name: "Custom Reports",
    comparison: {
      docita: "yes",
      practo: "partial",
      paper: "no",
      genericEHR: "partial",
    },
  },
  {
    name: "API Access",
    tooltip: "Integration with other healthcare systems",
    comparison: {
      docita: "yes",
      practo: "no",
      paper: "no",
      genericEHR: "partial",
    },
  },
  {
    name: "Dental Charting",
    comparison: {
      docita: "yes",
      practo: "partial",
      paper: "yes",
      genericEHR: "no",
    },
  },
  {
    name: "Pediatric Growth Charts",
    comparison: {
      docita: "yes",
      practo: "no",
      paper: "no",
      genericEHR: "partial",
    },
  },
];

const statusLabels = {
  docita: {
    setup: "5 minutes",
    price: "Free tier available",
  },
  practo: {
    setup: "2-3 days",
    price: "₹5,999/month",
  },
  paper: {
    setup: "N/A",
    price: "Free (+ supplies)",
  },
  genericEHR: {
    setup: "2+ weeks",
    price: "₹10,000+/month",
  },
};

function FeatureIcon({ status }: { status: FeatureStatus }) {
  switch (status) {
    case "yes":
      return (
        <div className="h-6 w-6 rounded-full bg-success/15 flex items-center justify-center">
          <Check className="h-4 w-4 text-success" />
        </div>
      );
    case "no":
      return (
        <div className="h-6 w-6 rounded-full bg-destructive/15 flex items-center justify-center">
          <X className="h-4 w-4 text-destructive" />
        </div>
      );
    case "partial":
      return (
        <div className="h-6 w-6 rounded-full bg-warning/15 flex items-center justify-center">
          <Minus className="h-4 w-4 text-warning" />
        </div>
      );
    case "na":
      return <span className="text-muted-foreground text-sm">N/A</span>;
  }
}

export function FeatureComparisonTable({ className }: { className?: string }) {
  return (
    <TooltipProvider>
      <div className={cn("w-full overflow-x-auto", className)}>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[200px]">Feature</TableHead>
              <TableHead className="text-center">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-primary font-bold text-lg">Docita</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {statusLabels.docita.price}
                  </span>
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex flex-col items-center gap-1">
                  <span className="font-semibold">Practo</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {statusLabels.practo.price}
                  </span>
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex flex-col items-center gap-1">
                  <span className="font-semibold">Paper Records</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {statusLabels.paper.price}
                  </span>
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex flex-col items-center gap-1">
                  <span className="font-semibold">Generic EHR</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {statusLabels.genericEHR.price}
                  </span>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {}
            <TableRow>
              <TableCell className="font-medium">Setup Time</TableCell>
              <TableCell className="text-center">
                <span className="text-success font-semibold">
                  {statusLabels.docita.setup}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-warning">
                  {statusLabels.practo.setup}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-muted-foreground">
                  {statusLabels.paper.setup}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-destructive">
                  {statusLabels.genericEHR.setup}
                </span>
              </TableCell>
            </TableRow>

            {}
            {features.slice(1).map((feature) => (
              <TableRow key={feature.name}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-1.5">
                    {feature.name}
                    {feature.tooltip && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-[200px] text-xs">
                            {feature.tooltip}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex justify-center">
                    <FeatureIcon status={feature.comparison.docita} />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex justify-center">
                    <FeatureIcon status={feature.comparison.practo} />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex justify-center">
                    <FeatureIcon status={feature.comparison.paper} />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex justify-center">
                    <FeatureIcon status={feature.comparison.genericEHR} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}

export function FeatureComparisonCards({ className }: { className?: string }) {
  const docitaFeatures = features.filter((f) => f.comparison.docita === "yes");

  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
      {}
      <div className="rounded-xl border-2 border-primary bg-primary/5 p-4">
        <div className="text-center mb-4">
          <h3 className="text-lg font-bold text-primary">Docita</h3>
          <p className="text-sm text-muted-foreground">Free tier available</p>
        </div>
        <ul className="space-y-2">
          {docitaFeatures.slice(0, 6).map((feature) => (
            <li key={feature.name} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-success shrink-0" />
              {feature.name}
            </li>
          ))}
          <li className="text-xs text-primary font-medium pt-2">
            +{docitaFeatures.length - 6} more features
          </li>
        </ul>
      </div>

      {}
      <div className="rounded-xl border p-4">
        <div className="text-center mb-4">
          <h3 className="text-lg font-bold">Practo</h3>
          <p className="text-sm text-muted-foreground">₹5,999/month</p>
        </div>
        <ul className="space-y-2">
          {features.slice(0, 6).map((feature) => (
            <li key={feature.name} className="flex items-center gap-2 text-sm">
              {feature.comparison.practo === "yes" ? (
                <Check className="h-4 w-4 text-success shrink-0" />
              ) : feature.comparison.practo === "partial" ? (
                <Minus className="h-4 w-4 text-warning shrink-0" />
              ) : (
                <X className="h-4 w-4 text-destructive shrink-0" />
              )}
              {feature.name}
            </li>
          ))}
        </ul>
      </div>

      {}
      <div className="rounded-xl border p-4">
        <div className="text-center mb-4">
          <h3 className="text-lg font-bold">Paper Records</h3>
          <p className="text-sm text-muted-foreground">Free (+ supplies)</p>
        </div>
        <ul className="space-y-2">
          {features.slice(0, 6).map((feature) => (
            <li key={feature.name} className="flex items-center gap-2 text-sm">
              {feature.comparison.paper === "yes" ? (
                <Check className="h-4 w-4 text-success shrink-0" />
              ) : feature.comparison.paper === "na" ? (
                <Minus className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <X className="h-4 w-4 text-destructive shrink-0" />
              )}
              {feature.name}
            </li>
          ))}
        </ul>
      </div>

      {}
      <div className="rounded-xl border p-4">
        <div className="text-center mb-4">
          <h3 className="text-lg font-bold">Generic EHR</h3>
          <p className="text-sm text-muted-foreground">₹10,000+/month</p>
        </div>
        <ul className="space-y-2">
          {features.slice(0, 6).map((feature) => (
            <li key={feature.name} className="flex items-center gap-2 text-sm">
              {feature.comparison.genericEHR === "yes" ? (
                <Check className="h-4 w-4 text-success shrink-0" />
              ) : feature.comparison.genericEHR === "partial" ? (
                <Minus className="h-4 w-4 text-warning shrink-0" />
              ) : (
                <X className="h-4 w-4 text-destructive shrink-0" />
              )}
              {feature.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
