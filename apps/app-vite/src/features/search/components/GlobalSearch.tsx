import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, Input, Popover, PopoverContent, PopoverTrigger, SymbolTooltip } from "@workspace/ui/components";
import { cn } from "@workspace/ui/lib/utils";
import type { SearchResult } from "@/features/search/api/search-api";
import { GLOBAL_SEARCH_INPUT_ID } from "./global-search-constants";
import { GlobalSearchResultsPanel } from "./global-search-results-panel";
import { useGlobalSearch } from "./use-global-search";

interface GlobalSearchProps {
  onResultClick?: (result: SearchResult) => void;
}

export function GlobalSearch({ onResultClick }: GlobalSearchProps) {
  const { t } = useTranslation("Search");
  const search = useGlobalSearch(onResultClick);

  return (
    <Popover open={search.open} onOpenChange={(next) => { search.setOpen(next); if (!next) search.closePopover(); }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("h-10 min-h-10 w-10 shrink-0 touch-manipulation justify-center p-0 font-normal transition-colors duration-150", "text-muted-foreground md:h-9 md:min-h-0 md:w-auto md:justify-start md:gap-2 md:px-2.5")}
          aria-expanded={search.open}
          aria-haspopup="dialog"
          aria-label={t("ariaLabel")}
        >
          <Search className="size-4 shrink-0" aria-hidden />
          <span className="hidden max-w-[min(12rem,calc(100vw-12rem))] truncate text-[length:var(--fs-sm)] font-normal text-foreground md:inline">{t("triggerLabel")}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(100vw-2rem,28rem)] p-3" align="start" sideOffset={8} onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="flex flex-col gap-2">
          <label htmlFor={GLOBAL_SEARCH_INPUT_ID} className="sr-only">{t("srLabel")}</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              ref={search.inputRef}
              id={GLOBAL_SEARCH_INPUT_ID}
              type="text"
              value={search.query}
              onChange={(e) => { search.setQuery(e.target.value); search.setSelectedIndex(-1); }}
              onKeyDown={search.handleKeyDown}
              placeholder={t("inputPlaceholder")}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="h-10 pl-10 pr-10 bg-muted/40 transition-colors duration-150 hover:bg-background"
              aria-label={t("inputAriaLabel")}
              aria-expanded={search.showResultsPanel}
              aria-controls="search-results"
              aria-activedescendant={search.selectedIndex >= 0 ? `result-${search.selectedIndex}` : undefined}
              role="combobox"
            />
            {search.query ? (
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                <SymbolTooltip label={t("clearSearch")}>
                  <Button type="button" variant="ghost" size="icon" onClick={() => { search.setQuery(""); search.inputRef.current?.focus(); }} className="h-7 w-7" aria-label="Clear search">
                    <X className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </Button>
                </SymbolTooltip>
              </div>
            ) : null}
          </div>
          {search.showResultsPanel ? (
            <GlobalSearchResultsPanel
              query={search.query}
              results={search.results}
              selectedIndex={search.selectedIndex}
              isLoading={search.isLoading}
              isError={search.isError}
              error={search.error}
              onRetry={() => void search.refetch()}
              onResultClick={search.handleResultClick}
            />
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
