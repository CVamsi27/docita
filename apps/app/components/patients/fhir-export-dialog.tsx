"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileJson,
  Loader2,
  Pill,
  Stethoscope,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface FhirExportDialogProps {
  patientId: string;
  patientName: string;
  children?: React.ReactNode;
}

interface FhirResource {
  resourceType: string;
  id?: string;
  [key: string]: unknown;
}

interface FhirBundle {
  resourceType: "Bundle";
  type: string;
  total: number;
  entry: Array<{ resource: FhirResource }>;
}

export function FhirExportDialog({
  patientId,
  patientName,
  children,
}: FhirExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("bundle");
  const [bundle, setBundle] = useState<FhirBundle | null>(null);
  const [resources, setResources] = useState<{
    patient: FhirResource | null;
    observations: FhirResource[];
    medications: FhirResource[];
    conditions: FhirResource[];
    allergies: FhirResource[];
  }>({
    patient: null,
    observations: [],
    medications: [],
    conditions: [],
    allergies: [],
  });
  const { token } = useAuth();

  const fetchFhirData = async () => {
    if (!token) return;
    setLoading(true);

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      // Fetch all FHIR resources in parallel
      const [bundleRes, patientRes, obsRes, medRes, condRes, allergyRes] =
        await Promise.all([
          fetch(`${API_URL}/fhir/Bundle/${patientId}`, { headers }),
          fetch(`${API_URL}/fhir/Patient/${patientId}`, { headers }),
          fetch(`${API_URL}/fhir/Observation?patient=${patientId}`, {
            headers,
          }),
          fetch(`${API_URL}/fhir/MedicationRequest?patient=${patientId}`, {
            headers,
          }),
          fetch(`${API_URL}/fhir/Condition?patient=${patientId}`, { headers }),
          fetch(`${API_URL}/fhir/AllergyIntolerance?patient=${patientId}`, {
            headers,
          }),
        ]);

      if (bundleRes.ok) {
        setBundle(await bundleRes.json());
      }

      setResources({
        patient: patientRes.ok ? await patientRes.json() : null,
        observations: obsRes.ok ? await obsRes.json() : [],
        medications: medRes.ok ? await medRes.json() : [],
        conditions: condRes.ok ? await condRes.json() : [],
        allergies: allergyRes.ok ? await allergyRes.json() : [],
      });
    } catch (error) {
      console.error("Error fetching FHIR data:", error);
      toast.error("Failed to fetch FHIR data");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !bundle) {
      fetchFhirData();
    }
  };

  const downloadJson = (data: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  const copyToClipboard = (data: unknown) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast.success("Copied to clipboard");
  };

  const downloadCCD = async () => {
    if (!token) return;
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/fhir/export/ccd/${patientId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const ccd = await response.json();
        downloadJson(
          ccd,
          `${patientName.replace(/\s+/g, "_")}_CCD_${new Date().toISOString().split("T")[0]}.json`,
        );
      } else {
        toast.error("Failed to generate CCD");
      }
    } catch (error) {
      console.error("Error exporting CCD:", error);
      toast.error("Failed to export CCD");
    } finally {
      setLoading(false);
    }
  };

  const ResourceCount = ({
    icon: Icon,
    label,
    count,
    color,
    bgColor,
  }: {
    icon: React.ElementType;
    label: string;
    count: number;
    color: string;
    bgColor: string;
  }) => (
    <Card className="border-none shadow-sm bg-muted/20">
      <CardContent className="p-4 flex flex-col items-center justify-center gap-2">
        <div className={`p-2 rounded-full ${bgColor}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{count}</div>
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            {label}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="gap-2">
            <FileJson className="h-4 w-4" />
            Export FHIR
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileJson className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-xl">FHIR R4 Export</DialogTitle>
              <DialogDescription className="text-base">
                Export clinical data for {patientName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
              <div className="relative p-4 bg-background rounded-full border shadow-sm">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="font-medium">Generating FHIR Bundle</p>
              <p className="text-sm text-muted-foreground">
                Collecting clinical resources...
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <ResourceCount
                icon={User}
                label="Patient"
                count={resources.patient ? 1 : 0}
                color="text-blue-600"
                bgColor="bg-blue-100 dark:bg-blue-900/30"
              />
              <ResourceCount
                icon={Activity}
                label="Vitals"
                count={resources.observations.length}
                color="text-green-600"
                bgColor="bg-green-100 dark:bg-green-900/30"
              />
              <ResourceCount
                icon={Pill}
                label="Meds"
                count={resources.medications.length}
                color="text-purple-600"
                bgColor="bg-purple-100 dark:bg-purple-900/30"
              />
              <ResourceCount
                icon={Stethoscope}
                label="Conditions"
                count={resources.conditions.length}
                color="text-orange-600"
                bgColor="bg-orange-100 dark:bg-orange-900/30"
              />
              <ResourceCount
                icon={AlertTriangle}
                label="Allergies"
                count={resources.allergies.length}
                color="text-red-600"
                bgColor="bg-red-100 dark:bg-red-900/30"
              />
            </div>

            {/* Export Actions */}
            <div className="flex gap-2 p-3 rounded-lg bg-muted/30 border">
              <Button
                onClick={() =>
                  bundle &&
                  downloadJson(
                    bundle,
                    `${patientName.replace(/\s+/g, "_")}_FHIR_Bundle_${new Date().toISOString().split("T")[0]}.json`,
                  )
                }
                disabled={!bundle}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Bundle
              </Button>
              <Button
                onClick={downloadCCD}
                variant="outline"
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Download CCD
              </Button>
              <Button
                onClick={() => bundle && copyToClipboard(bundle)}
                variant="outline"
                size="icon"
                disabled={!bundle}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            {/* Resource Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-6 mb-4">
                <TabsTrigger value="bundle">Bundle</TabsTrigger>
                <TabsTrigger value="patient">Patient</TabsTrigger>
                <TabsTrigger value="observations">Vitals</TabsTrigger>
                <TabsTrigger value="medications">Meds</TabsTrigger>
                <TabsTrigger value="conditions">Conditions</TabsTrigger>
                <TabsTrigger value="allergies">Allergies</TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[350px] rounded-lg border bg-muted/10">
                <TabsContent value="bundle" className="m-0 p-4">
                  {bundle ? (
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {JSON.stringify(bundle, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No bundle data available
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="patient" className="m-0 p-4">
                  {resources.patient ? (
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {JSON.stringify(resources.patient, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No patient data available
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="observations" className="m-0 p-4">
                  {resources.observations.length > 0 ? (
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {JSON.stringify(resources.observations, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No vital sign observations available
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="medications" className="m-0 p-4">
                  {resources.medications.length > 0 ? (
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {JSON.stringify(resources.medications, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No medication requests available
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="conditions" className="m-0 p-4">
                  {resources.conditions.length > 0 ? (
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {JSON.stringify(resources.conditions, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No conditions/diagnoses available
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="allergies" className="m-0 p-4">
                  {resources.allergies.length > 0 ? (
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {JSON.stringify(resources.allergies, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No allergy intolerances available
                    </p>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>

            {/* FHIR Info */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-700 dark:text-blue-400">
                  FHIR R4 (v4.0.1) compliant • US Core profiles
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-blue-600"
              >
                <a
                  href="https://www.hl7.org/fhir/R4/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  FHIR Docs
                </a>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
