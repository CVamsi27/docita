"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Calendar, FileText, Loader2, Search, User, X } from "lucide-react";
import { useDebounce } from "@workspace/hooks/use-debounce";

interface SearchResult {
  id: string;
  type: "patient" | "appointment" | "prescription";
  title: string;
  subtitle?: string;
  meta?: Record<string, unknown>;
}

interface GlobalSearchProps {
  onResultClick?: (result: SearchResult) => void;
}

const typeIcons = {
  patient: User,
  appointment: Calendar,
  prescription: FileText,
};

const typeColors = {
  patient: "bg-blue-100 text-blue-700",
  appointment: "bg-green-100 text-green-700",
  prescription: "bg-purple-100 text-purple-700",
};

export function GlobalSearch({ onResultClick }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  // Search API call
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}`,
      );
      if (response.ok) {
        const data = await response.json();
        setResults(data);
      }
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Effect for debounced search
  useEffect(() => {
    performSearch(debouncedQuery);
  }, [debouncedQuery, performSearch]);

  // Handle result click
  const handleResultClick = useCallback(
    (result: SearchResult) => {
      setIsOpen(false);
      setQuery("");
      onResultClick?.(result);

      // Default navigation based on type
      const routes = {
        patient: `/patients/${result.id}`,
        appointment: `/appointments?id=${result.id}`,
        prescription: `/prescriptions/${result.id}`,
      };
      window.location.href = routes[result.type];
    },
    [onResultClick],
  );

  // Keyboard navigation
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

  // Close on click outside
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

  // Global keyboard shortcut (Cmd/Ctrl + K)
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
      {/* Search Input */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
          aria-hidden="true"
        />
        <input
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
          className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg 
                     focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                     bg-gray-50 hover:bg-white transition-colors"
          aria-label="Global search"
          aria-expanded={isOpen}
          aria-controls="search-results"
          aria-activedescendant={
            selectedIndex >= 0 ? `result-${selectedIndex}` : undefined
          }
          role="combobox"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded"
            aria-label="Clear search"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (query.length >= 2 || results.length > 0) && (
        <div
          id="search-results"
          role="listbox"
          className="absolute top-full mt-2 w-full bg-white border border-gray-200 
                     rounded-lg shadow-lg max-h-80 overflow-y-auto z-50"
        >
          {isLoading ? (
            <div className="flex items-center justify-center p-4 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Searching...
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
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer
                               ${index === selectedIndex ? "bg-indigo-50" : "hover:bg-gray-50"}`}
                  >
                    <div
                      className={`p-2 rounded-full ${typeColors[result.type]}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {result.title}
                      </div>
                      {result.subtitle && (
                        <div className="text-sm text-gray-500 truncate">
                          {result.subtitle}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 capitalize">
                      {result.type}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : query.length >= 2 ? (
            <div className="p-4 text-center text-gray-500">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default GlobalSearch;
