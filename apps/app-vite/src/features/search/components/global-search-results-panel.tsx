import { AlertTriangle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/form/button";
import { sanitizeUserFacingMessage } from "@workspace/utils";
import type { SearchResult } from "@/features/search/api/search-api";
import { typeColors, typeIcons } from "./global-search-constants";

export function GlobalSearchResultsPanel({
  query, results, selectedIndex, isLoading, isError, error, onRetry, onResultClick,
}: {
  query: string;
  results: SearchResult[];
  selectedIndex: number;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  onResultClick: (result: SearchResult) => void;
}) {
  const { t } = useTranslation("Search");
  return (
    <div id="search-results" role="listbox" className="max-h-80 overflow-y-auto rounded-md border border-border/60 bg-card shadow-sm">
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 p-4 text-muted-foreground" role="status" aria-live="polite">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          {t("results.searching")}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-2 p-4 text-center text-destructive" role="alert" aria-live="assertive" data-testid="global-search-error">
          <AlertTriangle className="h-5 w-5" aria-hidden />
          <p className="text-[length:var(--fs-sm)]">
            {sanitizeUserFacingMessage(error instanceof Error ? error.message : "", t("results.errorMessage"))}
          </p>
          <Button variant="link" size="sm" onClick={onRetry}>{t("results.tryAgain")}</Button>
        </div>
      ) : results.length > 0 ? (
        <ul className="py-2">
          {results.map((result, index) => {
            const Icon = typeIcons[result.type];
            return (
              <li
                key={result.id}
                id={`result-${index}`}
                role="option"
                aria-selected={index === selectedIndex}
                onClick={() => onResultClick(result)}
                className={cn("flex cursor-pointer items-center gap-3 px-4 py-3", index === selectedIndex ? "bg-muted/60" : "hover:bg-muted/60")}
              >
                <div className={cn("rounded-full border px-2 py-2", typeColors[result.type])}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-foreground">{result.title}</div>
                  {result.subtitle ? <div className="truncate text-[length:var(--fs-sm)] text-muted-foreground">{result.subtitle}</div> : null}
                </div>
                <span className="text-[length:var(--fs-2xs)] capitalize text-muted-foreground">{result.type}</span>
              </li>
            );
          })}
        </ul>
      ) : query.length >= 2 ? (
        <div className="p-4 text-center text-muted-foreground">{t("results.noResults", { query })}</div>
      ) : null}
    </div>
  );
}
