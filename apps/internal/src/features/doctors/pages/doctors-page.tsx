import { useState, useEffect, useMemo } from "react";
import { AppPageScaffold, Badge, Button, Card, CardContent, CardHeader, CardTitle, DataState, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components";
import { Eye, ShieldCheck, ShieldX, Stethoscope } from "lucide-react";
import { apiGet } from "@/lib/api/api-client";

interface Doctor {
  id: string;
  name: string;
  email: string;
  registrationNumber?: string;
  registrationCouncil?: string;
  registrationStateCode?: string;
  verificationStatus?: string;
  verificationReason?: string;
  verificationSource?: string;
  verificationCheckedAt?: string;
  clinic?: { id: string; name: string };
}

export function DoctorsPage() {
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [search, setSearch] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const data = await apiGet<Doctor[]>("/api/internal/doctors/verification-queue");
      setDoctors(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { void fetchDoctors(); }, []);

  const filteredDoctors = useMemo(() =>
    doctors.filter((d) => !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.email.toLowerCase().includes(search.toLowerCase())),
    [doctors, search]);

  return (
    <AppPageScaffold header={<PageHeader title="Doctors" description="Monitor doctor profiles, specializations, and credentials" size="compact" />}>
      <DataState status={loading ? "loading" : "success"} loadingMessage="Loading doctors…">
        <div className="mb-4 flex items-center gap-4">
          <Input placeholder="Search doctors by name or email…" value={search} onChange={(e) => { setSearch(e.target.value); }} className="max-w-sm" />
        </div>

        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Stethoscope className="h-5 w-5" /> Doctors ({filteredDoctors.length})</CardTitle></CardHeader>
          <CardContent>
            {filteredDoctors.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground"><Stethoscope className="h-10 w-10 mb-4" /><p>No doctors found</p></div>
            ) : (
              <div className="rounded-md border"><Table><TableHeader><TableRow>
                <TableHead>Doctor</TableHead><TableHead>Clinic</TableHead><TableHead>Registration</TableHead><TableHead>Verification</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>{filteredDoctors.map((doctor) => (
                <TableRow key={doctor.id}>
                  <TableCell><div><p className="font-medium">Dr. {doctor.name}</p><p className="text-sm text-muted-foreground">{doctor.email}</p></div></TableCell>
                  <TableCell>{doctor.clinic?.name ?? <span className="text-muted-foreground">-</span>}</TableCell>
                  <TableCell>{doctor.registrationNumber ? <Badge variant="outline">{doctor.registrationNumber}</Badge> : <span className="text-muted-foreground">-</span>}</TableCell>
                  <TableCell><div className="flex flex-wrap gap-2">
                    <Badge variant={doctor.verificationStatus === "VERIFIED" ? "default" : "secondary"}>
                      {doctor.verificationStatus === "VERIFIED" ? <ShieldCheck className="mr-1 h-3.5 w-3.5" /> : <ShieldX className="mr-1 h-3.5 w-3.5" />}
                      {doctor.verificationStatus || "Pending"}
                    </Badge>
                    {doctor.verificationReason && <span className="text-xs text-muted-foreground">{doctor.verificationReason}</span>}
                  </div></TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => { setSelectedDoctor(doctor); setIsViewOpen(true); }}><Eye className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}</TableBody></Table></div>
            )}
          </CardContent>
        </Card>
      </DataState>

      <Dialog open={isViewOpen} onOpenChange={(o) => { setIsViewOpen(o); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Stethoscope className="h-5 w-5" /> Dr. {selectedDoctor?.name}</DialogTitle>
            <DialogDescription>Complete doctor profile and credentials</DialogDescription></DialogHeader>
          {selectedDoctor && <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm font-medium text-muted-foreground">Email</p><p className="font-medium">{selectedDoctor.email}</p></div>
              <div><p className="text-sm font-medium text-muted-foreground">Clinic</p><p className="font-medium">{selectedDoctor.clinic?.name || "-"}</p></div>
              <div><p className="text-sm font-medium text-muted-foreground">Registration No.</p><p className="font-medium">{selectedDoctor.registrationNumber || "-"}</p></div>
              <div><p className="text-sm font-medium text-muted-foreground">Verification</p><Badge variant={selectedDoctor.verificationStatus === "VERIFIED" ? "default" : "secondary"}>{selectedDoctor.verificationStatus || "Pending"}</Badge></div>
            </div>
            {selectedDoctor.verificationReason && (
              <div className="border-t pt-4"><h3 className="font-semibold mb-3">Verification Notes</h3>
                <p className="text-sm text-muted-foreground">{selectedDoctor.verificationReason}</p>
              </div>
            )}
          </div>}
        </DialogContent>
      </Dialog>
    </AppPageScaffold>
  );
}
