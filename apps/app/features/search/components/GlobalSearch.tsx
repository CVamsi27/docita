"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AlertTriangle, Calendar, FileText, Search, User, X } from "lucide-react";
import { useDebounce } from "@workspace/hooks/use-debounce";
import { sanitizeUserFacingMessage } from "@workspace/utils";
import { appQueryKeys } from "@/lib/api/query-keys";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { Input } from "@workspace/ui/components/form/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/overlay/popover";
import { cn } from "@workspace/ui/lib/utils";
import {
  searchGlobal,
  type SearchResult,
} from "@/features/search/api/search-api";

interface GlobalSearchProps {
  onResultClick?: (result: SearchResult) => void;
}

const typeIcons = {
  patient: User,
  appointment: Calendar,
  prescription: FileText,
};

const typeColors = {
  patient: "badge-info",
  appointment: "badge-success",
  prescription: "tier-intelligence",
};

const GLOBAL_SEARCH_INPUT_ID = "global-search-combobox-input";

export function GlobalSearch({ onResultClick }: GlobalSearchProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(query, 300);
  const searchEnabled = debouncedQuery.length >= 2;
  const {
    data,
    isFetching: isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: appQueryKeys.search.global(debouncedQuery),
    queryFn: () => searchGlobal(debouncedQuery),
    enabled: searchEnabled && open,
    retry: false,
    staleTime: 30 * 1000,
  });
  const results = useMemo(
    () => (searchEnabled ? (data ?? []) : []),
    [data, searchEnabled],
  );

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    if (open) {
      focusInput();
    }
  }, [open, focusInput]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [debouncedQuery]);

  const handleResultClick = useCallback(
    (result: SearchResult) => {
      setOpen(false);
      setQuery("");
      onResultClick?.(result);

      const routes = {
        patient: `/patients/${result.id}`,
        appointment: `/appointments?id=${result.id}`,
        prescription: `/prescriptions/${result.id}`,
      };
      router.push(routes[result.type]);
    },
    [onResultClick, router],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : prev,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && results[selectedIndex]) {
            handleResultClick(results[selectedIndex]);
          }
          break;
        case "Escape":
          setOpen(false);
          setQuery("");
          inputRef.current?.blur();
          break;
      }
    },
    [results, selectedIndex, handleResultClick],
  );

  const showResultsPanel =
    open &&
    (query.length >= 2 || results.length > 0 || isError || isLoading);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setQuery("");
          setSelectedIndex(-1);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "h-10 min-h-10 w-10 shrink-0 touch-manipulation justify-center p-0 font-normal transition-colors duration-150",
            "text-muted-foreground md:h-9 md:min-h-0 md:w-auto md:justify-start md:gap-2 md:px-2.5",
          )}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label="Search patients, appointments, and prescriptions"
        >
          <Search className="size-4 shrink-0" aria-hidden />
          <span className="hidden max-w-[min(12rem,calc(100vw-12rem))] truncate text-[length:var(--fs-sm)] font-normal text-foreground md:inline">
            Search patients…
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(100vw-2rem,28rem)] p-3"
        align="start"
        sideOffset={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col gap-2">
          <label htmlFor={GLOBAL_SEARCH_INPUT_ID} className="sr-only">
            Global search
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              ref={inputRef}
              id={GLOBAL_SEARCH_INPUT_ID}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter patient, appointment, or prescription"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="h-10 pl-10 pr-10 bg-muted/40 transition-colors duration-150 hover:bg-background"
              aria-label="Global search"
              aria-expanded={showResultsPanel}
              aria-controls="search-results"
              aria-activedescendant={
                selectedIndex >= 0 ? `result-${selectedIndex}` : undefined
              }
              role="combobox"
            />
            {query ? (
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                <SymbolTooltip label="Clear search">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setQuery("");
                      inputRef.current?.focus();
                    }}
                    className="h-7 w-7"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </Button>
                </SymbolTooltip>
              </div>
            ) : null}
          </div>

          {showResultsPanel ? (
            <div
              id="search-results"
              role="listbox"
              className="max-h-80 overflow-y-auto rounded-md border border-border/60 ui-card-surface shadow-sm"
            >
              {isLoading ? (
                <div
                  className="flex items-center justify-center p-4 text-muted-foreground"
                  role="status"
                  aria-live="polite"
                >
                  <DocitaLoadingIndicator
                    variant="inline"
                    decorative
                    className="mr-2"
                    iconClassName="h-5 w-5"
                  />
                  Searching…
                </div>
              ) : isError ? (
                <div
                  className="flex flex-col items-center gap-2 p-4 text-center text-destructive"
                  role="alert"
                  aria-live="assertive"
                  data-testid="global-search-error"
                >
                  <AlertTriangle className="h-5 w-5" aria-hidden />
                  <p className="text-[length:var(--fs-sm)]">
                    {sanitizeUserFacingMessage(
                      error instanceof Error ? error.message : "",
                      "We could not run this search. Please try again.",
                    )}
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => {
                      void refetch();
                    }}
                  >
                    Try again
                  </Button>
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
                        onClick={() => handleResultClick(result)}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 px-4 py-3",
                          index === selectedIndex
                            ? "bg-muted/60"
                            : "hover:bg-muted/60",
                        )}
                      >
                        <div
                          className={cn(
                            "rounded-full border px-2 py-2",
                            typeColors[result.type],
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-foreground">
                            {result.title}
                          </div>
                          {result.subtitle ? (
                            <div className="truncate text-[length:var(--fs-sm)] text-muted-foreground">
                              {result.subtitle}
                            </div>
                          ) : null}
                        </div>
                        <span className="text-[length:var(--fs-2xs)] capitalize text-muted-foreground">
                          {result.type}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : query.length >= 2 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No results found for &ldquo;{query}&rdquo;
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

