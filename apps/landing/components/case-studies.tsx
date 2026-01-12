"use client";

import {
  Building2,
  Clock,
  TrendingDown,
  TrendingUp,
  ChevronRight,
  Quote,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";

interface CaseStudy {
  id: string;
  clinic: string;
  location: string;
  type: "multi-specialty" | "solo" | "chain";
  logo?: string;
  heroStat: {
    value: string;
    label: string;
    trend: "up" | "down";
  };
  results: {
    label: string;
    value: string;
    description?: string;
  }[];
  quote: {
    text: string;
    author: string;
    role: string;
  };
  challenge: string;
  solution: string;
  implementation: string;
  tags: string[];
}

const caseStudies: CaseStudy[] = [
  {
    id: "apollo",
    clinic: "Apollo Clinic",
    location: "Chennai",
    type: "multi-specialty",
    heroStat: {
      value: "40%",
      label: "Faster Operations",
      trend: "up",
    },
    results: [
      {
        label: "Paper Records",
        value: "0",
        description: "Completely paperless",
      },
      {
        label: "Patient Wait Time",
        value: "-35%",
        description: "Reduced average wait",
      },
      {
        label: "Daily Consultations",
        value: "+25%",
        description: "Increased capacity",
      },
      {
        label: "Staff Efficiency",
        value: "+50%",
        description: "Admin time saved",
      },
    ],
    quote: {
      text: "Docita transformed how we manage our multi-specialty practice. The queue management alone saved us hours every day.",
      author: "Dr. Priya Venkatesh",
      role: "Medical Director",
    },
    challenge:
      "Managing 5 departments with paper records led to long patient wait times and lost files. Doctors spent more time on paperwork than patient care.",
    solution:
      "Implemented Docita across all departments with unified patient records, smart queue management, and digital prescriptions.",
    implementation: "Full deployment in 2 weeks with staff training",
    tags: ["Multi-Specialty", "50+ Staff", "High Volume"],
  },
  {
    id: "lifecare",
    clinic: "LifeCare Multi-Specialty",
    location: "Bangalore",
    type: "chain",
    heroStat: {
      value: "50%",
      label: "Fewer No-Shows",
      trend: "down",
    },
    results: [
      {
        label: "Clinics Unified",
        value: "3",
        description: "Seamless data sharing",
      },
      {
        label: "Patient Retention",
        value: "+40%",
        description: "Better follow-ups",
      },
      {
        label: "Revenue Growth",
        value: "+30%",
        description: "In first 6 months",
      },
      {
        label: "Report Time",
        value: "-70%",
        description: "Automated analytics",
      },
    ],
    quote: {
      text: "With 3 locations, we needed a system that could unify our patient data. Docita made it seamless - patients can visit any branch.",
      author: "Mr. Rajesh Kumar",
      role: "CEO, LifeCare Group",
    },
    challenge:
      "Operating 3 clinics with separate systems meant patients had to repeat their history at each location. No unified view for management.",
    solution:
      "Centralized patient database with role-based access, automated reminders, and cross-location analytics dashboard.",
    implementation: "Phased rollout across 3 locations over 1 month",
    tags: ["Multi-Location", "Chain Practice", "Enterprise"],
  },
  {
    id: "sharma",
    clinic: "Dr. Sharmas Clinic",
    location: "Hyderabad",
    type: "solo",
    heroStat: {
      value: "2 hrs",
      label: "Saved Daily",
      trend: "up",
    },
    results: [
      {
        label: "Digital Records",
        value: "100%",
        description: "Fully digital now",
      },
      {
        label: "Prescription Time",
        value: "-80%",
        description: "Template-based Rx",
      },
      {
        label: "Patient Recall",
        value: "+60%",
        description: "WhatsApp reminders",
      },
      {
        label: "Monthly Savings",
        value: "₹15K",
        description: "Paper & admin costs",
      },
    ],
    quote: {
      text: "As a solo practitioner, I was skeptical about switching to digital. But Docita is so simple - I was up and running in a day!",
      author: "Dr. Anil Sharma",
      role: "General Physician",
    },
    challenge:
      "Solo practice with 30+ years of paper records. Hesitant about technology, but manual processes were becoming unsustainable.",
    solution:
      "Gradual migration with Docitas simple interface, prescription templates, and WhatsApp integration for patient communication.",
    implementation: "Self-setup in 1 day, full adoption in 1 week",
    tags: ["Solo Practice", "Quick Setup", "Cost-Effective"],
  },
];

const typeColors = {
  "multi-specialty":
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  chain:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  solo: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
};

function CaseStudyCard({ study }: { study: CaseStudy }) {
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{study.clinic}</CardTitle>
              <CardDescription>{study.location}</CardDescription>
            </div>
          </div>
          <Badge
            variant="secondary"
            className={cn("shrink-0", typeColors[study.type])}
          >
            {study.type === "multi-specialty"
              ? "Multi-Specialty"
              : study.type === "chain"
                ? "Chain"
                : "Solo"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        {/* Hero Stat */}
        <div className="mb-6 p-4 rounded-lg bg-linear-to-br from-primary/10 to-primary/5 border">
          <div className="flex items-center gap-2">
            {study.heroStat.trend === "up" ? (
              <TrendingUp className="h-8 w-8 text-green-600" />
            ) : (
              <TrendingDown className="h-8 w-8 text-green-600" />
            )}
            <div>
              <p className="text-3xl font-bold text-primary">
                {study.heroStat.value}
              </p>
              <p className="text-sm text-muted-foreground">
                {study.heroStat.label}
              </p>
            </div>
          </div>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {study.results.slice(0, 4).map((result, idx) => (
            <div key={idx} className="p-3 rounded-lg bg-muted/50">
              <p className="text-lg font-semibold">{result.value}</p>
              <p className="text-xs text-muted-foreground">{result.label}</p>
            </div>
          ))}
        </div>

        {/* Quote */}
        <div className="p-4 rounded-lg bg-muted/30 border-l-4 border-primary">
          <Quote className="h-5 w-5 text-primary/50 mb-2" />
          <p className="text-sm italic text-muted-foreground line-clamp-3">
            &ldquo;{study.quote.text}&rdquo;
          </p>
          <div className="mt-3">
            <p className="text-sm font-medium">{study.quote.author}</p>
            <p className="text-xs text-muted-foreground">{study.quote.role}</p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-4 border-t">
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              className="w-full group-hover:bg-primary/10"
            >
              Read Full Story
              <ChevronRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle>{study.clinic}</DialogTitle>
                  <DialogDescription>{study.location}</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {study.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Challenge */}
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">
                  The Challenge
                </h4>
                <p className="text-sm">{study.challenge}</p>
              </div>

              {/* Solution */}
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">
                  Our Solution
                </h4>
                <p className="text-sm">{study.solution}</p>
              </div>

              {/* Implementation */}
              <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    Implementation
                  </p>
                  <p className="text-sm font-medium">{study.implementation}</p>
                </div>
              </div>

              {/* Full Results */}
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                  Results
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {study.results.map((result, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-lg bg-muted/50 border"
                    >
                      <p className="text-2xl font-bold text-primary">
                        {result.value}
                      </p>
                      <p className="text-sm font-medium">{result.label}</p>
                      {result.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {result.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Quote */}
              <div className="p-6 rounded-lg bg-linear-to-br from-primary/10 to-primary/5 border">
                <Quote className="h-8 w-8 text-primary/30 mb-3" />
                <p className="text-lg italic mb-4">
                  &ldquo;{study.quote.text}&rdquo;
                </p>
                <div>
                  <p className="font-semibold">{study.quote.author}</p>
                  <p className="text-sm text-muted-foreground">
                    {study.quote.role}
                  </p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}

interface CaseStudiesSectionProps {
  className?: string;
}

export function CaseStudiesSection({ className }: CaseStudiesSectionProps) {
  return (
    <section className={cn("py-20 bg-muted/30", className)}>
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            Success Stories
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Trusted by Clinics of All Sizes
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            See how healthcare providers across India are transforming their
            practices with Docita
          </p>
        </div>

        {/* Case Study Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {caseStudies.map((study) => (
            <CaseStudyCard key={study.id} study={study} />
          ))}
        </div>

        {/* Bottom Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 rounded-xl bg-background border">
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-bold text-primary">25+</p>
            <p className="text-sm text-muted-foreground">Active Clinics</p>
          </div>
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-bold text-primary">10K+</p>
            <p className="text-sm text-muted-foreground">Patients Served</p>
          </div>
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-bold text-primary">4.8/5</p>
            <p className="text-sm text-muted-foreground">Average Rating</p>
          </div>
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-bold text-primary">95%</p>
            <p className="text-sm text-muted-foreground">Would Recommend</p>
          </div>
        </div>
      </div>
    </section>
  );
}
