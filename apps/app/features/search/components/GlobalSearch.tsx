"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  FileText,
  Loader2,
  Search,
  User,
  X,
} from "lucide-react";
import { useDebounce } from "@workspace/hooks/use-debounce";
import { sanitizeUserFacingMessage } from "@workspace/types";
import { appQueryKeys } from "@/lib/query-keys";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
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

export function GlobalSearch({ onResultClick }: GlobalSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    enabled: searchEnabled,
    retry: false,
    staleTime: 30 * 1000,
  });
  const results = useMemo(
    () => (searchEnabled ? (data ?? []) : []),
    [data, searchEnabled],
  );

  const handleResultClick = useCallback(
    (result: SearchResult) => {
      setIsOpen(false);
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
          setIsOpen(false);
          setQuery("");
          inputRef.current?.blur();
          break;
      }
    },
    [results, selectedIndex, handleResultClick],
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search patients, appointments... (⌘K)"
          className="h-10 pl-10 pr-10 bg-muted/40 hover:bg-background"
          aria-label="Global search"
          aria-expanded={isOpen}
          aria-controls="search-results"
          aria-activedescendant={
            selectedIndex >= 0 ? `result-${selectedIndex}` : undefined
          }
          role="combobox"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-1.5 top-1/2 h-7 w-7 -translate-y-1/2"
            aria-label="Clear search"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </div>

      {isOpen && (query.length >= 2 || results.length > 0 || isError) && (
        <div
          id="search-results"
          role="listbox"
          className="absolute top-full z-50 mt-2 w-full max-h-80 overflow-y-auto ui-card-surface shadow-lg"
        >
          {isLoading ? (
            <div
              className="flex items-center justify-center p-4 text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              <Loader2
                className="h-5 w-5 animate-spin mr-2"
                aria-hidden="true"
              />
              Searching...
            </div>
          ) : isError ? (
            <div
              className="flex flex-col items-center gap-2 p-4 text-center text-destructive"
              role="alert"
              aria-live="assertive"
              data-testid="global-search-error"
            >
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              <p className="text-sm">
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
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">
                        {result.title}
                      </div>
                      {result.subtitle && (
                        <div className="text-sm text-muted-foreground truncate">
                          {result.subtitle}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground capitalize">
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
      )}
    </div>
  );
}

export default GlobalSearch;
