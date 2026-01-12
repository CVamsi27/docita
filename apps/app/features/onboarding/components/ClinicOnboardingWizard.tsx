"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Progress } from "@workspace/ui/components/progress";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Building2, Users, Calendar, Settings } from "lucide-react";

// Onboarding Wizard with proper UI
export function ClinicOnboardingWizard() {
  const router = useRouter();
  const steps = [
    { id: 1, title: "Clinic Information", description: "Basic clinic details", icon: Building2, completed: true },
    { id: 2, title: "Add Team Members", description: "Invite doctors and staff", icon: Users, completed: false },
    { id: 3, title: "Configure Schedule", description: "Set working hours", icon: Calendar, completed: false },
    { id: 4, title: "Settings", description: "Customize your experience", icon: Settings, completed: false },
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progress = (completedCount / steps.length) * 100;

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Welcome to Docita!</h1>
        <p className="text-muted-foreground">
          Let's get your clinic set up. This will only take a few minutes.
        </p>
      </div>

      <Card className="border-none shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Setup Progress</CardTitle>
            <span className="text-sm text-muted-foreground">{completedCount}/{steps.length} completed</span>
          </div>
          <Progress value={progress} className="mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${
                step.completed 
                  ? "bg-green-50 dark:bg-green-950/20" 
                  : "bg-muted/30 hover:bg-muted/50"
              }`}
            >
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                step.completed 
                  ? "bg-green-500 text-white" 
                  : "bg-muted text-muted-foreground"
              }`}>
                {step.completed ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1">
                <p className={`font-medium ${step.completed ? "text-green-700 dark:text-green-400" : ""}`}>
                  {step.title}
                </p>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
              {!step.completed && (
                <Button 
                  size="sm"
                  onClick={() => {
                    const routeMap: Record<number, string> = {
                      1: "/settings?tab=general",
                      2: "/settings?tab=members",
                      3: "/settings?tab=availability",
                      4: "/settings",
                    };
                    const route = routeMap[step.id];
                    if (route) router.push(route);
                  }}
                >
                  Start
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button variant="outline" className="gap-2">
          Skip for now
        </Button>
      </div>
    </div>
  );
}
