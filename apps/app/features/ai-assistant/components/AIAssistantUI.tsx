
import React, { FC } from "react";
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
  AlertTriangle,
  Brain,
  Calendar,
  CheckCircle2,
  FileText,
  History,
  Lightbulb,
  Loader2,
  Pill,
  Send,
  Shield,
  Sparkles,
  Stethoscope,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { FeatureGuard } from "@/features/_shared/components/feature-guard";
import { Feature } from "@/lib/stores/permission-store";
import type { 
  PrescriptionSuggestion, 
  DrugInteraction, 
  DiagnosisSuggestion 
} from "../hooks/use-ai-assistant-logic";

interface AIAssistantUIProps {
  state: any;
  handlers: any;
}

export const AIAssistantUI: FC<AIAssistantUIProps> = ({ state, handlers }) => {
  return (
    <FeatureGuard feature={Feature.AI_PRESCRIPTION_ASSISTANT}>
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <AIAssistantHeader />

        <Tabs
          value={state.activeTab}
          onValueChange={handlers.setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="prescription" className="flex items-center gap-2">
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

          <TabsContent value="prescription" className="space-y-6">
            <PrescriptionAssistantTab state={state} handlers={handlers} />
          </TabsContent>

          <TabsContent value="diagnosis" className="space-y-6">
            <DiagnosisAssistantTab state={state} handlers={handlers} />
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <InsightsTab />
          </TabsContent>

          <TabsContent value="tasks" className="space-y-6">
            <SmartTasksTab state={state} handlers={handlers} />
          </TabsContent>
        </Tabs>
      </div>
    </FeatureGuard>
  );
};

const AIAssistantHeader = () => (
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
        <Sparkles className="h-8 w-8 text-primary" />
        AI Assistant
      </h1>
      <p className="text-muted-foreground">
        AI-powered clinical decision support for prescriptions, diagnoses, and workflow automation.
      </p>
    </div>
    <Badge variant="secondary" className="bg-linear-to-r from-pink-500 to-purple-500 text-white">
      <Sparkles className="h-3 w-3 mr-1" />
      Docita Intelligence
    </Badge>
  </div>
);

const PrescriptionAssistantTab = ({ state, handlers }: any) => (
  <div className="grid gap-6 lg:grid-cols-2">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pill className="h-5 w-5 text-blue-500" />
          Prescription Assistant
        </CardTitle>
        <CardDescription>Get AI-powered medication suggestions and drug interaction checks</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Symptoms / Chief Complaint</label>
          <Textarea 
            placeholder="e.g., Sore throat, fever for 3 days, difficulty swallowing..." 
            value={state.symptoms} 
            onChange={(e) => handlers.setSymptoms(e.target.value)} 
            rows={3} 
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Working Diagnosis</label>
          <Input 
            placeholder="e.g., Acute Pharyngitis" 
            value={state.diagnosis} 
            onChange={(e) => handlers.setDiagnosis(e.target.value)} 
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Current Medications (for interaction check)</label>
          <Textarea 
            placeholder="e.g., Warfarin 5mg daily, Lisinopril 10mg daily..." 
            value={state.currentMedications} 
            onChange={(e) => handlers.setCurrentMedications(e.target.value)} 
            rows={2} 
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Known Allergies</label>
          <Input 
            placeholder="e.g., Penicillin, Sulfa drugs..." 
            value={state.allergies} 
            onChange={(e) => handlers.setAllergies(e.target.value)} 
          />
        </div>
        <Button onClick={handlers.handlePrescriptionAnalysis} disabled={state.isLoading || !state.symptoms} className="w-full">
          {state.isLoading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</>
          ) : (
            <><Sparkles className="h-4 w-4 mr-2" />Get Suggestions</>
          )}
        </Button>
      </CardContent>
    </Card>

    <div className="space-y-6">
      {state.drugInteractions.length > 0 && (
        <DrugInteractionsList interactions={state.drugInteractions} />
      )}
      {state.prescriptionSuggestions.length > 0 ? (
        <PrescriptionSuggestionsList suggestions={state.prescriptionSuggestions} />
      ) : !state.isLoading && (
        <EmptyState 
          icon={Lightbulb} 
          label="Enter symptoms and diagnosis to get AI-powered medication suggestions" 
        />
      )}
    </div>
  </div>
);

const DrugInteractionsList = ({ interactions }: { interactions: DrugInteraction[] }) => (
  <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-orange-600">
        <AlertTriangle className="h-5 w-5" />
        Drug Interactions Detected
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {interactions.map((interaction, idx) => (
          <div key={idx} className="p-3 rounded-lg bg-white dark:bg-background border">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={interaction.severity === "high" ? "destructive" : interaction.severity === "moderate" ? "secondary" : "outline"}>
                {interaction.severity.toUpperCase()}
              </Badge>
              <span className="font-medium text-sm">{interaction.drug1} ↔ {interaction.drug2}</span>
            </div>
            <p className="text-sm text-muted-foreground">{interaction.description}</p>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const PrescriptionSuggestionsList = ({ suggestions }: { suggestions: PrescriptionSuggestion[] }) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-green-500" />
        Suggested Medications
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {suggestions.map((suggestion, idx) => (
          <div key={idx} className="p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">{suggestion.medication}</span>
              <Button size="sm" variant="outline">Add to Prescription</Button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div><span className="font-medium">Dosage:</span> {suggestion.dosage}</div>
              <div><span className="font-medium">Route:</span> {suggestion.route}</div>
              <div><span className="font-medium">Frequency:</span> {suggestion.frequency}</div>
              <div><span className="font-medium">Duration:</span> {suggestion.duration}</div>
            </div>
            {suggestion.notes && (
              <p className="mt-2 text-xs text-muted-foreground bg-muted p-2 rounded">💡 {suggestion.notes}</p>
            )}
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const DiagnosisAssistantTab = ({ state, handlers }: any) => (
  <div className="grid gap-6 lg:grid-cols-2">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-500" />
          Diagnosis Assistant
        </CardTitle>
        <CardDescription>AI-powered differential diagnosis suggestions based on clinical findings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Chief Complaint</label>
          <Textarea 
            placeholder="e.g., 45-year-old male presents with chest pain radiating to left arm..." 
            value={state.chiefComplaint} 
            onChange={(e) => handlers.setChiefComplaint(e.target.value)} 
            rows={3} 
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Vital Signs</label>
          <Textarea 
            placeholder="e.g., BP: 150/90, HR: 88, Temp: 98.6°F, SpO2: 97%..." 
            value={state.vitalSigns} 
            onChange={(e) => handlers.setVitalSigns(e.target.value)} 
            rows={2} 
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Physical Examination Findings</label>
          <Textarea 
            placeholder="e.g., Pharynx erythematous, tonsillar exudates present..." 
            value={state.examFindings} 
            onChange={(e) => handlers.setExamFindings(e.target.value)} 
            rows={3} 
          />
        </div>
        <Button onClick={handlers.handleDiagnosisAnalysis} disabled={state.isLoading || !state.chiefComplaint} className="w-full">
          {state.isLoading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</>
          ) : (
            <><Sparkles className="h-4 w-4 mr-2" />Get Differential Diagnoses</>
          )}
        </Button>
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <Shield className="h-4 w-4 text-amber-600 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            <strong>Clinical Decision Support:</strong> These suggestions are for reference only and do not replace clinical judgment.
          </p>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2"><Stethoscope className="h-5 w-5" />Differential Diagnoses</CardTitle>
        <CardDescription>Ranked by confidence based on provided information</CardDescription>
      </CardHeader>
      <CardContent>
        {state.diagnosisSuggestions.length > 0 ? (
          <div className="space-y-3">
            {state.diagnosisSuggestions.map((suggestion: DiagnosisSuggestion, idx: number) => (
              <div key={idx} className={cn("p-4 rounded-lg border transition-colors", idx === 0 ? "bg-green-50 dark:bg-green-950/20 border-green-200" : "bg-muted/30")}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{suggestion.condition}</span>
                    <Badge variant="outline" className="font-mono text-xs">{suggestion.icdCode}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
                      <div className={cn("h-full rounded-full", suggestion.confidence >= 70 ? "bg-green-500" : suggestion.confidence >= 50 ? "bg-yellow-500" : "bg-orange-500")} style={{ width: `${suggestion.confidence}%` }} />
                    </div>
                    <span className="text-sm font-medium">{suggestion.confidence}%</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{suggestion.reasoning}</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline">Select as Primary</Button>
                  <Button size="sm" variant="ghost">View Details</Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Brain} label="Enter clinical findings to get AI-powered diagnosis suggestions" />
        )}
      </CardContent>
    </Card>
  </div>
);

const InsightsTab = () => (
  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
    <InsightCard title="No-Show Prediction" description="Patients likely to miss appointments" color="blue">
      <div className="space-y-3">
        <RiskItem name="John Smith" time="Tomorrow, 10:00 AM" risk="78% risk" variant="destructive" />
        <RiskItem name="Sarah Johnson" time="Tomorrow, 2:30 PM" risk="52% risk" variant="secondary" />
        <Button variant="outline" className="w-full" size="sm">Send Reminders</Button>
      </div>
    </InsightCard>
    
    <InsightCard title="Patient Segmentation" description="AI-powered patient grouping" color="purple">
      <div className="space-y-2">
        <SegmentItem label="Chronic Care" count="156 patients" />
        <SegmentItem label="High Risk" count="42 patients" variant="destructive" />
        <SegmentItem label="Due for Follow-up" count="89 patients" variant="secondary" />
        <SegmentItem label="Lost to Follow-up" count="23 patients" variant="outline" />
      </div>
    </InsightCard>

    <InsightCard title="Anomaly Detection" description="Unusual patterns detected" color="green">
      <div className="space-y-3">
        <AnomalyItem title="Revenue Drop" description="15% decrease in invoice collections this week" type="warning" />
        <AnomalyItem title="Appointment Surge" description="30% increase in respiratory complaints" type="info" />
      </div>
    </InsightCard>
  </div>
);

const SmartTasksTab = ({ state, handlers }: any) => (
  <div className="grid gap-6 lg:grid-cols-2">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-orange-500" />Smart Task Engine</CardTitle>
        <CardDescription>AI-powered workflow automation</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Task Type</label>
          <Select value={state.taskType} onValueChange={handlers.setTaskType}>
            <SelectTrigger><SelectValue placeholder="Select a task type..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="follow-up">Schedule Follow-ups</SelectItem>
              <SelectItem value="recalls">Patient Recalls</SelectItem>
              <SelectItem value="reminders">Custom Reminders</SelectItem>
              <SelectItem value="reports">Generate Reports</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="p-4 rounded-lg border bg-muted/30">
          <h4 className="font-medium mb-2">Quick Actions</h4>
          <div className="space-y-2">
            <QuickActionButton icon={Calendar} label="Auto-schedule all pending follow-ups" />
            <QuickActionButton icon={Send} label="Send reminders to no-show risks" />
            <QuickActionButton icon={FileText} label="Generate weekly summary report" />
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Recent Automations</CardTitle></CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-3">
            <AutomationItem task="Sent 15 appointment reminders" time="2 hours ago" />
            <AutomationItem task="Generated monthly analytics report" time="1 day ago" />
            <AutomationItem task="Scheduled 8 follow-up appointments" time="2 hours ago" />
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  </div>
);

const InsightCard = ({ title, description, color, children }: any) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

const RiskItem = ({ name, time, risk, variant }: any) => (
  <div className={cn("flex items-center justify-between p-3 rounded-lg", variant === "destructive" ? "bg-red-50 dark:bg-red-950/20" : "bg-orange-50 dark:bg-orange-950/20")}>
    <div>
      <p className="font-medium">{name}</p>
      <p className="text-xs text-muted-foreground">{time}</p>
    </div>
    <Badge variant={variant}>{risk}</Badge>
  </div>
);

const SegmentItem = ({ label, count, variant }: any) => (
  <div className="flex items-center justify-between">
    <span className="text-sm">{label}</span>
    <Badge variant={variant}>{count}</Badge>
  </div>
);

const AnomalyItem = ({ title, description, type }: any) => (
  <div className={cn("p-3 rounded-lg border", type === "warning" ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200" : "bg-blue-50 dark:bg-blue-950/20 border-blue-200")}>
    <p className="text-sm font-medium">{title}</p>
    <p className="text-xs text-muted-foreground">{description}</p>
  </div>
);

const QuickActionButton = ({ icon: Icon, label }: any) => (
  <Button variant="outline" className="w-full justify-start" size="sm">
    <Icon className="h-4 w-4 mr-2" />
    {label}
  </Button>
);

const AutomationItem = ({ task, time }: any) => (
  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
    <div>
      <p className="text-sm font-medium">{task}</p>
      <p className="text-xs text-muted-foreground">{time}</p>
    </div>
    <CheckCircle2 className="h-4 w-4 text-green-500" />
  </div>
);

const EmptyState = ({ icon: Icon, label }: any) => (
  <div className="flex flex-col items-center justify-center py-12">
    <Icon className="h-12 w-12 text-muted-foreground/50 mb-4" />
    <p className="text-muted-foreground text-center">{label}</p>
  </div>
);
