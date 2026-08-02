import { useState } from "react";
import { useCreateMedicalDocument, useMedicalDocuments, useRevokeMedicalDocument, useSignMedicalDocument, useUploadFile } from "@workspace/data-access";
import { useAuth } from "@/lib/auth/auth-context";
import { logger } from "@/lib/monitoring/logger";
import { toast } from "sonner";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

export function useMedicalDocumentList(patientId: string) {
  const { user } = useAuth();
  const { data: documents = [], isLoading: loading, isError, refetch } = useMedicalDocuments(patientId);
  const signDocument = useSignMedicalDocument();
  const revokeDocument = useRevokeMedicalDocument();
  const createDocument = useCreateMedicalDocument();

  const [showNew, setShowNew] = useState(false);
  const [newType, setNewType] = useState("MEDICAL_CERTIFICATE");
  const [newTitle, setNewTitle] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newFileUrl, setNewFileUrl] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const qrUrl: string | null = null;

  const handleSign = async (id: string) => {
    try {
      await signDocument.mutateAsync(id);
      toast.success("Document signed");
    } catch (err) {
      logger.error("Failed to sign document", { err });
      showUserFacingErrorToast("We could not sign this document. Please try again.");
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeDocument.mutateAsync(id);
      toast.success("Document revoked");
    } catch (err) {
      logger.error("Failed to revoke document", { err });
      showUserFacingErrorToast("We could not revoke this document. Please try again.");
    }
  };

  const uploadFile = useUploadFile();

  const handleCreate = async () => {
    if (!newTitle.trim()) { showUserFacingErrorToast("Enter a document title before creating it"); return; }
    setCreating(true);
    try {
      let pdfUrl: string | undefined;
      if (newFile) {
        const uploadResult = await uploadFile.mutateAsync({ file: newFile, endpoint: "/api/upload" });
        pdfUrl = uploadResult.fileUrl || undefined;
      }
      await createDocument.mutateAsync({ type: newType, patientId, title: newTitle.trim(), content: {}, doctorId: user?.id ?? "", ...(pdfUrl ? { pdfUrl } : {}) });
      toast.success("Document created");
      setShowNew(false);
      setNewTitle("");
      setNewType("MEDICAL_CERTIFICATE");
      setNewFile(null);
      setNewFileUrl(null);
    } catch (err) {
      logger.error("Failed to create document", { err });
      showUserFacingErrorToast("We could not create this document. Please try again.");
    } finally { setCreating(false); }
  };

  const handleFileChange = (file: File | null) => { setNewFile(file); setNewFileUrl(file ? URL.createObjectURL(file) : null); };
  const handleMobileUpload = () => {};

  return { loading, isError, refetch, documents, showNew, setShowNew, newType, setNewType, newTitle, setNewTitle, newFile, newFileUrl, creating, showQr, setShowQr, qrUrl, handleSign, handleRevoke, handleCreate, handleFileChange, handleMobileUpload };
}
