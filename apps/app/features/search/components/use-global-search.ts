"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useDebounce } from "@workspace/hooks/use-debounce";
import { appQueryKeys } from "@/lib/api/query-keys";
import {
  searchGlobal,
  type SearchResult,
} from "@/features/search/api/search-api";
import { searchResultRoutes } from "./global-search-constants";

export function useGlobalSearch(onResultClick?: (result: SearchResult) => void) {
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
      router.push(searchResultRoutes[result.type](result.id));
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
    open && (query.length >= 2 || results.length > 0 || isError || isLoading);

  const closePopover = useCallback(() => {
    setOpen(false);
    setQuery("");
    setSelectedIndex(-1);
  }, []);

  return {
    open,
    setOpen,
    query,
    setQuery,
    selectedIndex,
    setSelectedIndex,
    inputRef,
    results,
    isLoading,
    isError,
    error,
    refetch,
    handleKeyDown,
    handleResultClick,
    showResultsPanel,
    closePopover,
  };
}
