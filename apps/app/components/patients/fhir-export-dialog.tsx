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
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Download,
  FileJson,
  Loader2,
  User,
  Activity,
  Pill,
  Stethoscope,
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
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
  }: {
    icon: React.ElementType;
    label: string;
    count: number;
    color: string;
  }) => (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
      <Icon className={`h-4 w-4 ${color}`} />
      <span className="text-sm">{label}</span>
      <Badge variant="secondary" className="ml-auto">
        {count}
      </Badge>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <FileJson className="h-4 w-4 mr-2" />
            Export FHIR
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-primary" />
            FHIR R4 Export - {patientName}
          </DialogTitle>
          <DialogDescription>
            Export patient data in FHIR R4 format for health information
            exchange and interoperability.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading FHIR resources...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-5 gap-2">
              <ResourceCount
                icon={User}
                label="Patient"
                count={resources.patient ? 1 : 0}
                color="text-blue-500"
              />
              <ResourceCount
                icon={Activity}
                label="Vitals"
                count={resources.observations.length}
                color="text-green-500"
              />
              <ResourceCount
                icon={Pill}
                label="Medications"
                count={resources.medications.length}
                color="text-purple-500"
              />
              <ResourceCount
                icon={Stethoscope}
                label="Conditions"
                count={resources.conditions.length}
                color="text-orange-500"
              />
              <ResourceCount
                icon={AlertTriangle}
                label="Allergies"
                count={resources.allergies.length}
                color="text-red-500"
              />
            </div>

            {/* Export Actions */}
            <div className="flex gap-2 p-3 rounded-lg bg-muted/50 border">
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
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="bundle">Bundle</TabsTrigger>
                <TabsTrigger value="patient">Patient</TabsTrigger>
                <TabsTrigger value="observations">Vitals</TabsTrigger>
                <TabsTrigger value="medications">Meds</TabsTrigger>
                <TabsTrigger value="conditions">Conditions</TabsTrigger>
                <TabsTrigger value="allergies">Allergies</TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[400px] mt-4 rounded-lg border">
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
