import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, Input, SymbolTooltip } from "@workspace/ui/components";
import { cn } from "@workspace/ui/lib/utils";

export function DocumentsPageSearchBar({
  searchQuery,
  onSearchQueryChange,
}: {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}) {
  const { t } = useTranslation("Documents");
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-full max-w-sm">
        <Search
          className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none"
          aria-hidden
        />
        <Input
          placeholder={t("searchPlaceholder")}
          className={cn(
            "bg-background pl-9",
            searchQuery.trim() ? "pr-10" : "",
          )}
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          aria-label={t("searchAriaLabel")}
        />
        {searchQuery.trim() ? (
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
            <SymbolTooltip label={t("clearSearch")}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onSearchQueryChange("")}
                aria-label="Clear search"
              >
                <X className="h-4 w-4 text-muted-foreground" aria-hidden />
              </Button>
            </SymbolTooltip>
          </div>
        ) : null}
      </div>
    </div>
  );
}
