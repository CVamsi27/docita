"use client";

import { useCallback, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import {
  Button,
  Input,
  SymbolTooltip
} from "@workspace/ui/components";
import { cn } from "@workspace/ui/lib/utils";

const SETTINGS_SEARCH_INPUT_ID = "settings-search-filter-input";

function isTextFieldTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

interface SettingsExpandedSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function SettingsExpandedSearch({
  searchQuery,
  setSearchQuery,
}: SettingsExpandedSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTextFieldTarget(event.target)) return;
      const isSlash = event.key === "/" || event.key === "Slash";
      if (!isSlash) return;
      event.preventDefault();
      focusInput();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [focusInput]);

  const hasQuery = Boolean(searchQuery.trim());

  return (
    <div className="relative w-full">
      <label htmlFor={SETTINGS_SEARCH_INPUT_ID} className="sr-only">
        Filter settings
      </label>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        ref={inputRef}
        id={SETTINGS_SEARCH_INPUT_ID}
        type="search"
        name="settingsSearchFilter"
        autoComplete="off"
        placeholder="Filter settings…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className={cn(
          "h-10 rounded-[calc(var(--radius)-4px)] border-border/60 bg-card/70 pl-9 pr-10 text-sm shadow-sm transition-colors duration-150 hover:bg-card focus-visible:bg-card",
          !hasQuery && "pr-3",
        )}
        aria-label="Filter settings lists"
      />
      {hasQuery ? (
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
          <SymbolTooltip label="Clear filter">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setSearchQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear filter"
            >
              <X className="h-4 w-4 text-muted-foreground" aria-hidden />
            </Button>
          </SymbolTooltip>
        </div>
      ) : null}
    </div>
  );
}
