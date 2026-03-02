"use client";

import { useState, useMemo } from "react";
import {
  Calculator,
  Clock,
  DollarSign,
  TrendingUp,
  Users,
  IndianRupee,
  ChevronRight,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Slider } from "@workspace/ui/components/slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";

interface ROICalculatorProps {
  className?: string;
  subscriptionPrice?: number;
}

export function ROICalculator({
  className,
  subscriptionPrice = 4999,
}: ROICalculatorProps) {
  const [patientsPerDay, setPatientsPerDay] = useState(20);
  const [adminHoursPerDay, setAdminHoursPerDay] = useState(3);
  const [avgConsultationFee, setAvgConsultationFee] = useState(500);
  const [staffSalary, setStaffSalary] = useState(25000);

  const savings = useMemo(() => {

    const workingDaysPerMonth = 25;

    const timeSavedPerDayHours = adminHoursPerDay * 0.5;
    const timeSavedPerMonthHours = timeSavedPerDayHours * workingDaysPerMonth;

    const staffHourlyCost = staffSalary / (25 * 8); 
    const staffCostSaved = timeSavedPerMonthHours * staffHourlyCost;

    const extraPatientsPerDay = Math.floor(patientsPerDay * 0.15);
    const extraPatientsPerMonth = extraPatientsPerDay * workingDaysPerMonth;
    const extraRevenuePerMonth = extraPatientsPerMonth * avgConsultationFee;

    const paperSavings = patientsPerDay * workingDaysPerMonth * 5; 

    const totalBenefit = staffCostSaved + extraRevenuePerMonth + paperSavings;
    const netBenefit = totalBenefit - subscriptionPrice;
    const roi = ((netBenefit / subscriptionPrice) * 100).toFixed(0);

    return {
      timeSavedPerMonthHours: Math.round(timeSavedPerMonthHours),
      staffCostSaved: Math.round(staffCostSaved),
      extraPatientsPerMonth,
      extraRevenuePerMonth: Math.round(extraRevenuePerMonth),
      paperSavings: Math.round(paperSavings),
      totalBenefit: Math.round(totalBenefit),
      netBenefit: Math.round(netBenefit),
      roi,
    };
  }, [
    patientsPerDay,
    adminHoursPerDay,
    avgConsultationFee,
    staffSalary,
    subscriptionPrice,
  ]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className={cn("w-full max-w-2xl mx-auto", className)}>
      <CardHeader className="text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Calculator className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">Calculate Your Savings</CardTitle>
        <CardDescription>
          See how much time and money you can save with Docita
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {}
        <div className="grid gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Patients per day
              </Label>
              <span className="text-lg font-semibold text-primary">
                {patientsPerDay}
              </span>
            </div>
            <Slider
              value={[patientsPerDay]}
              onValueChange={([v]) => setPatientsPerDay(v)}
              min={5}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Admin hours per day
              </Label>
              <span className="text-lg font-semibold text-primary">
                {adminHoursPerDay} hrs
              </span>
            </div>
            <Slider
              value={[adminHoursPerDay]}
              onValueChange={([v]) => setAdminHoursPerDay(v)}
              min={1}
              max={8}
              step={0.5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 hr</span>
              <span>4 hrs</span>
              <span>8 hrs</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
                Avg consultation fee
              </Label>
              <span className="text-lg font-semibold text-primary">
                {formatCurrency(avgConsultationFee)}
              </span>
            </div>
            <Slider
              value={[avgConsultationFee]}
              onValueChange={([v]) => setAvgConsultationFee(v)}
              min={100}
              max={2000}
              step={50}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>₹100</span>
              <span>₹1000</span>
              <span>₹2000</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Staff monthly salary
              </Label>
              <span className="text-lg font-semibold text-primary">
                {formatCurrency(staffSalary)}
              </span>
            </div>
            <Slider
              value={[staffSalary]}
              onValueChange={([v]) => setStaffSalary(v)}
              min={10000}
              max={50000}
              step={1000}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>₹10K</span>
              <span>₹30K</span>
              <span>₹50K</span>
            </div>
          </div>
        </div>

        {}
        <div className="mt-8 p-6 bg-linear-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20">
          <h4 className="text-center text-sm font-medium text-muted-foreground mb-4">
            YOUR ESTIMATED MONTHLY SAVINGS
          </h4>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center p-3 bg-background rounded-lg">
              <Clock className="h-5 w-5 mx-auto mb-1 text-info" />
              <p className="text-2xl font-bold">
                {savings.timeSavedPerMonthHours}
              </p>
              <p className="text-xs text-muted-foreground">Hours saved/month</p>
            </div>
            <div className="text-center p-3 bg-background rounded-lg">
              <Users className="h-5 w-5 mx-auto mb-1 text-success" />
              <p className="text-2xl font-bold">
                +{savings.extraPatientsPerMonth}
              </p>
              <p className="text-xs text-muted-foreground">
                Extra patients/month
              </p>
            </div>
            <div className="text-center p-3 bg-background rounded-lg">
              <DollarSign className="h-5 w-5 mx-auto mb-1 text-warning" />
              <p className="text-2xl font-bold">
                {formatCurrency(savings.staffCostSaved)}
              </p>
              <p className="text-xs text-muted-foreground">Staff cost saved</p>
            </div>
            <div className="text-center p-3 bg-background rounded-lg">
              <TrendingUp className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">
                {formatCurrency(savings.extraRevenuePerMonth)}
              </p>
              <p className="text-xs text-muted-foreground">Extra revenue</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">
                Total monthly benefit
              </span>
              <span className="font-medium">
                {formatCurrency(savings.totalBenefit)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Docita subscription</span>
              <span className="font-medium text-destructive">
                -{formatCurrency(subscriptionPrice)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="font-semibold text-lg">Net Monthly Benefit</span>
              <span
                className={cn(
                  "text-2xl font-bold",
                  savings.netBenefit > 0 ? "text-success" : "text-destructive",
                )}
              >
                {formatCurrency(savings.netBenefit)}
              </span>
            </div>
            <div className="text-center mt-2">
              <span className="text-sm text-muted-foreground">
                ROI:{" "}
                <span className="font-semibold text-primary">
                  {savings.roi}%
                </span>
              </span>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-3">
        <Button className="w-full" size="lg">
          Start Saving Today - 7 Day Free Trial
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          No credit card required • 7 day free trial • Cancel anytime
        </p>
      </CardFooter>
    </Card>
  );
}
