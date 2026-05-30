import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Owns the appointments-page "add" dialog state and its round-trip with the
 * `action=new&patientId=...` URL params. Opening via the URL preselects a
 * patient; closing the dialog strips both params.
 */
export function useAppointmentsDialogUrlSync() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(
    () => searchParams.get("action") === "new",
  );

  const currentAction = searchParams.get("action");
  useEffect(() => {
    if (currentAction === "new") {
      setIsAddDialogOpen(true);
    }
  }, [currentAction]);

  const handleDialogChange = useCallback(
    (open: boolean) => {
      setIsAddDialogOpen(open);
      if (!open) {
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete("action");
        newParams.delete("patientId");
        const qs = newParams.toString();
        router.replace(qs.length > 0 ? `/appointments?${qs}` : "/appointments", {
          scroll: false,
        });
      }
    },
    [searchParams, router],
  );

  const preselectedPatientId = useMemo(
    () => searchParams.get("patientId") || undefined,
    [searchParams],
  );

  return {
    isAddDialogOpen,
    handleDialogChange,
    preselectedPatientId,
  };
}
