import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

/**
 * Owns the appointments-page "add" dialog state and its round-trip with the
 * `action=new&patient=...` URL params. Opening via the URL preselects a
 * patient; closing the dialog strips both params.
 */
export function useAppointmentsDialogUrlSync() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
        newParams.delete("patient");
        const qs = newParams.toString();
        navigate(qs.length > 0 ? `/appointments?${qs}` : "/appointments", {
          replace: true,
        });
      }
    },
    [searchParams, navigate],
  );

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
