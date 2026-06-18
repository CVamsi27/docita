import { SUPPORT_EMAIL } from "@/lib/constants/support-contact";

interface DoctorInfo {
  name?: string;
  qualification?: string | null;
  registrationNumber?: string | null;
  signatureUrl?: string | null;
}

interface PrescriptionDocumentFooterProps {
  doctorInfo: DoctorInfo | undefined;
  doctorName: string;
}

export function PrescriptionDocumentFooter({ doctorInfo, doctorName }: PrescriptionDocumentFooterProps) {
  return (
    <>
      <div className="pt-8 mt-8 border-t">
        <div className="flex justify-end">
          <div className="text-center min-w-[200px]">
            {doctorInfo?.signatureUrl ? (
              <div className="mb-2">
                <img src={doctorInfo.signatureUrl} alt="Doctor's Signature" className="h-[60px] w-auto mx-auto object-contain" />
              </div>
            ) : (
              <div className="h-[60px] border-b-2 border-muted-foreground/50 mb-2" />
            )}
            <p className="font-bold">Dr. {doctorName}</p>
            {doctorInfo?.qualification && (
              <p className="text-sm text-muted-foreground">{doctorInfo.qualification}</p>
            )}
            {doctorInfo?.registrationNumber && (
              <p className="text-sm font-medium">Reg. No: {doctorInfo.registrationNumber}</p>
            )}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t text-center text-xs text-muted-foreground space-y-1">
        <p className="font-medium">This is a digitally generated prescription</p>
        <p>Powered by Docita</p>
        <p>Prescription support: {SUPPORT_EMAIL}</p>
        <p>Valid for dispensing within 30 days from the date of issue unless otherwise specified</p>
      </div>
    </>
  );
}
