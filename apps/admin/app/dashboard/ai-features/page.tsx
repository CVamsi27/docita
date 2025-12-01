"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Badge } from "@workspace/ui/components/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Loader2, Zap, Eye } from "lucide-react";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

interface Clinic {
  id: string;
  name: string;
  tier: string;
  intelligenceAddon: string;
  features?: Record<string, boolean>;
  email: string;
  phone: string;
}

interface AIFeatureStatus {
  tier: string;
  aiEnabled: boolean;
  features?: Record<string, boolean>;
}

export default function AIFeaturesPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [aiFeatures, setAIFeatures] = useState<AIFeatureStatus | null>(null);
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const { token, isSuperAdmin } = useAuth();

  const loadClinics = async () => {
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/super-admin/clinics`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setClinics(data);
      }
    } catch (error) {
      console.error("Failed to load clinics", error);
      toast.error("Failed to load clinics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin && token) {
      loadClinics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, token]);

  const loadAIFeatures = async (clinic: Clinic) => {
    if (!token) return;

    setFeaturesLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/super-admin/clinics/${clinic.id}/ai-features`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        const data = await res.json();
        setAIFeatures(data);
        setSelectedClinic(clinic);
      }
    } catch (error) {
      console.error("Failed to load AI features", error);
      toast.error("Failed to load AI features");
    } finally {
      setFeaturesLoading(false);
    }
  };

  const handleEnableAI = async (clinic: Clinic) => {
    if (!token) return;

    try {
      const res = await fetch(
        `${API_URL}/super-admin/clinics/${clinic.id}/enable-ai`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (res.ok) {
        toast.success("AI features enabled successfully");
        loadClinics();
        loadAIFeatures(clinic);
      } else {
        const error = await res.json();
        toast.error(error.message || "Failed to enable AI features");
      }
    } catch (error) {
      console.error("Failed to enable AI features", error);
      toast.error("Failed to enable AI features");
    }
  };

  const handleDisableAI = async (clinic: Clinic) => {
    if (!token) return;

    try {
      const res = await fetch(
        `${API_URL}/super-admin/clinics/${clinic.id}/disable-ai`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (res.ok) {
        toast.success("AI features disabled successfully");
        loadClinics();
        loadAIFeatures(clinic);
      }
    } catch (error) {
      console.error("Failed to disable AI features", error);
      toast.error("Failed to disable AI features");
    }
  };

  const getTierBadgeColor = (tier: string) => {
    const colors: Record<string, string> = {
      CAPTURE: "bg-gray-100 text-gray-800",
      CORE: "bg-blue-100 text-blue-800",
      PLUS: "bg-purple-100 text-purple-800",
      PRO: "bg-orange-100 text-orange-800",
      ENTERPRISE: "bg-red-100 text-red-800",
    };
    return colors[tier] || "bg-gray-100 text-gray-800";
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Access denied</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          AI Features Management
        </h1>
        <p className="text-muted-foreground">
          Enable or disable AI features for clinics based on their tier
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Clinics with AI Features Available
            </CardTitle>
            <CardDescription>
              Manage AI feature access for {clinics.length} clinics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {clinics.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No clinics found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Clinic Name</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>AI Status</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clinics.map((clinic) => (
                    <TableRow key={clinic.id}>
                      <TableCell className="font-medium">
                        {clinic.name}
                      </TableCell>
                      <TableCell>
                        <Badge className={getTierBadgeColor(clinic.tier)}>
                          {clinic.tier}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            clinic.intelligenceAddon === "ACTIVE"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {clinic.intelligenceAddon === "ACTIVE"
                            ? "Enabled"
                            : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{clinic.email}</TableCell>
                      <TableCell className="text-sm">{clinic.phone}</TableCell>
                      <TableCell className="space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => loadAIFeatures(clinic)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {clinic.tier === "PRO" ||
                        clinic.tier === "ENTERPRISE" ? (
                          <>
                            {clinic.intelligenceAddon !== "ACTIVE" ? (
                              <Button
                                size="sm"
                                onClick={() => handleEnableAI(clinic)}
                              >
                                <Zap className="h-4 w-4 mr-1" />
                                Enable AI
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDisableAI(clinic)}
                              >
                                Disable AI
                              </Button>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Upgrade to PRO
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Features Details Dialog */}
      <Dialog
        open={!!selectedClinic}
        onOpenChange={() => setSelectedClinic(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI Features - {selectedClinic?.name}</DialogTitle>
            <DialogDescription>
              Detailed view of AI features for this clinic
            </DialogDescription>
          </DialogHeader>

          {featuresLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : aiFeatures ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Clinic Tier
                  </p>
                  <Badge className={getTierBadgeColor(aiFeatures.tier)}>
                    {aiFeatures.tier}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    AI Status
                  </p>
                  <Badge
                    variant={aiFeatures.aiEnabled ? "default" : "secondary"}
                  >
                    {aiFeatures.aiEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>

              {aiFeatures.features && (
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium">Feature Status</h4>
                  {Object.entries(aiFeatures.features).map(([key, enabled]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm capitalize">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </span>
                      <Badge variant={enabled ? "default" : "secondary"}>
                        {enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
