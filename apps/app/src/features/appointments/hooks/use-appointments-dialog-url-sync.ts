import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { useAddDialogUrlSync } from "@/hooks/use-add-dialog-url-sync";

/**
 * Owns the appointments-page "add" dialog state and its round-trip with the
 * `action=new&patient=...` URL params. Opening via the URL preselects a
 * patient; closing the dialog strips both params.
 */
export function useAppointmentsDialogUrlSync() {
  const [searchParams] = useSearchParams();
  const { isAddDialogOpen, handleDialogChange } = useAddDialogUrlSync({
    basePath: "/appointments",
    deleteParams: ["patient"],
  });

  const preselectedPatientId = useMemo(
    () => searchParams.get("patient") || undefined,
    [searchParams],
  );

  return {
    isAddDialogOpen,
    handleDialogChange,
    preselectedPatientId,
  };
}
