"use client";

import { useState } from "react";
import { FeatureGuard } from "@/components/auth/feature-guard";
import { Feature } from "@/lib/stores/permission-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { Badge } from "@workspace/ui/components/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Sparkles,
  Brain,
  Pill,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Stethoscope,
  FileText,
  TrendingUp,
  Users,
  Calendar,
  Send,
  History,
  Lightbulb,
  Shield,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

// AI response types
interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: "low" | "moderate" | "high";
  description: string;
}

interface DiagnosisSuggestion {
  condition: string;
  icdCode: string;
  confidence: number;
  reasoning: string;
}

interface PrescriptionSuggestion {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  notes: string;
}

export default function AIAssistantPage() {
  const [activeTab, setActiveTab] = useState("prescription");
  const [isLoading, setIsLoading] = useState(false);

  // Prescription Assistant State
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [currentMedications, setCurrentMedications] = useState("");
  const [allergies, setAllergies] = useState("");
  const [prescriptionSuggestions, setPrescriptionSuggestions] = useState<
    PrescriptionSuggestion[]
  >([]);
  const [drugInteractions, setDrugInteractions] = useState<DrugInteraction[]>(
    [],
  );

  // Diagnosis Assistant State
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [vitalSigns, setVitalSigns] = useState("");
  const [examFindings, setExamFindings] = useState("");
  const [diagnosisSuggestions, setDiagnosisSuggestions] = useState<
    DiagnosisSuggestion[]
  >([]);

  // Smart Task State
  const [taskType, setTaskType] = useState("");

  const handlePrescriptionAnalysis = async () => {
    setIsLoading(true);
    // TODO: Replace with actual AI API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setPrescriptionSuggestions([
      {
        medication: "Amoxicillin",
        dosage: "500mg",
        frequency: "TID (Three times daily)",
        duration: "7 days",
        route: "Oral",
        notes: "Take with food to reduce GI upset",
      },
      {
        medication: "Ibuprofen",
        dosage: "400mg",
        frequency: "PRN (As needed)",
        duration: "5 days",
        route: "Oral",
        notes: "Maximum 3 doses per day. Take with food.",
      },
    ]);

    setDrugInteractions([
      {
        drug1: "Amoxicillin",
        drug2: "Warfarin",
        severity: "moderate",
        description:
          "Amoxicillin may increase the anticoagulant effect of warfarin. Monitor INR closely.",
      },
    ]);

    setIsLoading(false);
  };

  const handleDiagnosisAnalysis = async () => {
    setIsLoading(true);
    // TODO: Replace with actual AI API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setDiagnosisSuggestions([
      {
        condition: "Acute Pharyngitis",
        icdCode: "J02.9",
        confidence: 85,
        reasoning:
          "Sore throat, fever, and examination findings consistent with pharyngeal inflammation.",
      },
      {
        condition: "Upper Respiratory Infection",
        icdCode: "J06.9",
        confidence: 72,
        reasoning:
          "Symptoms of cough, congestion, and mild fever suggest viral URI.",
      },
      {
        condition: "Streptococcal Pharyngitis",
        icdCode: "J02.0",
        confidence: 45,
        reasoning:
          "Consider if rapid strep test is positive. Absence of cough increases likelihood.",
      },
    ]);

    setIsLoading(false);
  };

  return (
    <FeatureGuard feature={Feature.AI_PRESCRIPTION_ASSISTANT}>
      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              AI Assistant
            </h1>
            <p className="text-muted-foreground">
              AI-powered clinical decision support for prescriptions, diagnoses,
              and workflow automation.
            </p>
          </div>
          <Badge
            variant="secondary"
            className="bg-gradient-to-r from-pink-500 to-purple-500 text-white"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Docita Intelligence
          </Badge>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger
              value="prescription"
              className="flex items-center gap-2"
            >
              <Pill className="h-4 w-4" />
              <span className="hidden sm:inline">Prescription</span>
            </TabsTrigger>
            <TabsTrigger value="diagnosis" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Diagnosis</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Insights</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Smart Tasks</span>
            </TabsTrigger>
          </TabsList>

          {/* Prescription Assistant Tab */}
          <TabsContent value="prescription" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Pill className="h-5 w-5 text-blue-500" />
                    Prescription Assistant
                  </CardTitle>
                  <CardDescription>
                    Get AI-powered medication suggestions and drug interaction
                    checks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Symptoms / Chief Complaint
                    </label>
                    <Textarea
                      placeholder="e.g., Sore throat, fever for 3 days, difficulty swallowing..."
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Working Diagnosis
                    </label>
                    <Input
                      placeholder="e.g., Acute Pharyngitis"
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Current Medications (for interaction check)
                    </label>
                    <Textarea
                      placeholder="e.g., Warfarin 5mg daily, Lisinopril 10mg daily..."
                      value={currentMedications}
                      onChange={(e) => setCurrentMedications(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Known Allergies
                    </label>
                    <Input
                      placeholder="e.g., Penicillin, Sulfa drugs..."
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handlePrescriptionAnalysis}
                    disabled={isLoading || !symptoms}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Get Suggestions
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <div className="space-y-6">
                {/* Drug Interactions Warning */}
                {drugInteractions.length > 0 && (
                  <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-orange-600">
                        <AlertTriangle className="h-5 w-5" />
                        Drug Interactions Detected
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {drugInteractions.map((interaction, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg bg-white dark:bg-background border"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                variant={
                                  interaction.severity === "high"
                                    ? "destructive"
                                    : interaction.severity === "moderate"
                                      ? "secondary"
                                      : "outline"
                                }
                              >
                                {interaction.severity.toUpperCase()}
                              </Badge>
                              <span className="font-medium text-sm">
                                {interaction.drug1} ↔ {interaction.drug2}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {interaction.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Prescription Suggestions */}
                {prescriptionSuggestions.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        Suggested Medications
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {prescriptionSuggestions.map((suggestion, idx) => (
                          <div
                            key={idx}
                            className="p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold">
                                {suggestion.medication}
                              </span>
                              <Button size="sm" variant="outline">
                                Add to Prescription
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                              <div>
                                <span className="font-medium">Dosage:</span>{" "}
                                {suggestion.dosage}
                              </div>
                              <div>
                                <span className="font-medium">Route:</span>{" "}
                                {suggestion.route}
                              </div>
                              <div>
                                <span className="font-medium">Frequency:</span>{" "}
                                {suggestion.frequency}
                              </div>
                              <div>
                                <span className="font-medium">Duration:</span>{" "}
                                {suggestion.duration}
                              </div>
                            </div>
                            {suggestion.notes && (
                              <p className="mt-2 text-xs text-muted-foreground bg-muted p-2 rounded">
                                💡 {suggestion.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {prescriptionSuggestions.length === 0 && !isLoading && (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Lightbulb className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground text-center">
                        Enter symptoms and diagnosis to get AI-powered
                        medication suggestions
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Diagnosis Assistant Tab */}
          <TabsContent value="diagnosis" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-500" />
                    Diagnosis Assistant
                  </CardTitle>
                  <CardDescription>
                    AI-powered differential diagnosis suggestions based on
                    clinical findings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Chief Complaint
                    </label>
                    <Textarea
                      placeholder="e.g., 45-year-old male presents with chest pain radiating to left arm..."
                      value={chiefComplaint}
                      onChange={(e) => setChiefComplaint(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Vital Signs</label>
                    <Textarea
                      placeholder="e.g., BP: 150/90, HR: 88, Temp: 98.6°F, SpO2: 97%..."
                      value={vitalSigns}
                      onChange={(e) => setVitalSigns(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Physical Examination Findings
                    </label>
                    <Textarea
                      placeholder="e.g., Pharynx erythematous, tonsillar exudates present..."
                      value={examFindings}
                      onChange={(e) => setExamFindings(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <Button
                    onClick={handleDiagnosisAnalysis}
                    disabled={isLoading || !chiefComplaint}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Get Differential Diagnoses
                      </>
                    )}
                  </Button>

                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                    <Shield className="h-4 w-4 text-amber-600 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      <strong>Clinical Decision Support:</strong> These
                      suggestions are for reference only and do not replace
                      clinical judgment. Always verify diagnoses through
                      appropriate clinical assessment and testing.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="h-5 w-5" />
                    Differential Diagnoses
                  </CardTitle>
                  <CardDescription>
                    Ranked by confidence based on provided information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {diagnosisSuggestions.length > 0 ? (
                    <div className="space-y-3">
                      {diagnosisSuggestions.map((suggestion, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "p-4 rounded-lg border transition-colors",
                            idx === 0
                              ? "bg-green-50 dark:bg-green-950/20 border-green-200"
                              : "bg-muted/30",
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">
                                {suggestion.condition}
                              </span>
                              <Badge
                                variant="outline"
                                className="font-mono text-xs"
                              >
                                {suggestion.icdCode}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full",
                                    suggestion.confidence >= 70
                                      ? "bg-green-500"
                                      : suggestion.confidence >= 50
                                        ? "bg-yellow-500"
                                        : "bg-orange-500",
                                  )}
                                  style={{ width: `${suggestion.confidence}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">
                                {suggestion.confidence}%
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {suggestion.reasoning}
                          </p>
                          <div className="mt-3 flex gap-2">
                            <Button size="sm" variant="outline">
                              Select as Primary
                            </Button>
                            <Button size="sm" variant="ghost">
                              View Details
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Brain className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground text-center">
                        Enter clinical findings to get AI-powered diagnosis
                        suggestions
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    No-Show Prediction
                  </CardTitle>
                  <CardDescription>
                    Patients likely to miss appointments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
                      <div>
                        <p className="font-medium">John Smith</p>
                        <p className="text-xs text-muted-foreground">
                          Tomorrow, 10:00 AM
                        </p>
                      </div>
                      <Badge variant="destructive">78% risk</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                      <div>
                        <p className="font-medium">Sarah Johnson</p>
                        <p className="text-xs text-muted-foreground">
                          Tomorrow, 2:30 PM
                        </p>
                      </div>
                      <Badge variant="secondary">52% risk</Badge>
                    </div>
                    <Button variant="outline" className="w-full" size="sm">
                      Send Reminders
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-500" />
                    Patient Segmentation
                  </CardTitle>
                  <CardDescription>AI-powered patient grouping</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Chronic Care</span>
                      <Badge>156 patients</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">High Risk</span>
                      <Badge variant="destructive">42 patients</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Due for Follow-up</span>
                      <Badge variant="secondary">89 patients</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Lost to Follow-up</span>
                      <Badge variant="outline">23 patients</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Anomaly Detection
                  </CardTitle>
                  <CardDescription>Unusual patterns detected</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200">
                      <p className="text-sm font-medium">Revenue Drop</p>
                      <p className="text-xs text-muted-foreground">
                        15% decrease in invoice collections this week
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200">
                      <p className="text-sm font-medium">Appointment Surge</p>
                      <p className="text-xs text-muted-foreground">
                        30% increase in respiratory complaints
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Smart Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-orange-500" />
                    Smart Task Engine
                  </CardTitle>
                  <CardDescription>
                    AI-powered workflow automation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Task Type</label>
                    <Select value={taskType} onValueChange={setTaskType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a task type..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="follow-up">
                          Schedule Follow-ups
                        </SelectItem>
                        <SelectItem value="recalls">Patient Recalls</SelectItem>
                        <SelectItem value="reminders">
                          Custom Reminders
                        </SelectItem>
                        <SelectItem value="reports">
                          Generate Reports
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-4 rounded-lg border bg-muted/30">
                    <h4 className="font-medium mb-2">Quick Actions</h4>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        size="sm"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Auto-schedule all pending follow-ups
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        size="sm"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send reminders to no-show risks
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        size="sm"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Generate weekly summary report
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Recent Automations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {[
                        {
                          task: "Sent 15 appointment reminders",
                          time: "2 hours ago",
                          status: "success",
                        },
                        {
                          task: "Generated monthly analytics report",
                          time: "1 day ago",
                          status: "success",
                        },
                        {
                          task: "Scheduled 8 follow-up appointments",
                          time: "2 days ago",
                          status: "success",
                        },
                        {
                          task: "Sent 23 vaccination reminders",
                          time: "3 days ago",
                          status: "success",
                        },
                        {
                          task: "Updated patient risk scores",
                          time: "1 week ago",
                          status: "success",
                        },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                        >
                          <div>
                            <p className="text-sm font-medium">{item.task}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.time}
                            </p>
                          </div>
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </FeatureGuard>
  );
}
