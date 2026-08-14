import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

interface UseAddDialogUrlSyncOptions {
  /**
   * Route to return to after closing, e.g. "/appointments". Pass "" to keep
   * the current route and navigate relatively (`?qs` / ".").
   */
  basePath: string;
  /** Extra search params to strip on close, besides `action`. */
  deleteParams?: string[];
}

/**
 * Owns an "add" dialog's open state and its round-trip with the `action=new`
 * URL param: opening via the URL opens the dialog, closing strips `action`
 * (plus the given extra params) and navigates back to `basePath`.
 */
export function useAddDialogUrlSync({
  basePath,
  deleteParams = [],
}: UseAddDialogUrlSyncOptions) {
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
        for (const key of deleteParams) {
          newParams.delete(key);
        }
        const qs = newParams.toString();
        navigate(
          qs.length > 0
            ? basePath
              ? `${basePath}?${qs}`
              : `?${qs}`
            : basePath || ".",
          { replace: true },
        );
      }
    },
    [searchParams, navigate, basePath, deleteParams],
  );

  return { isAddDialogOpen, setIsAddDialogOpen, handleDialogChange };
}
