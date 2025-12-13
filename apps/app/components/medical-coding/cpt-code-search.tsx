"use client";

import * as React from "react";
import {
  AlertCircle,
  Check,
  DollarSign,
  Loader2,
  Search,
  Star,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@workspace/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";

import { API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@workspace/ui/components/badge";
import type { CptCode } from "@/types";

interface CptCodeSearchProps {
  onSelect: (code: CptCode) => void;
  selectedCodes?: string[]; // Array of selected code strings to disable/hide
}

interface CptFavoriteResponse {
  cptCode: CptCode;
}

export function CptCodeSearch({
  onSelect,
  selectedCodes = [],
}: CptCodeSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<CptCode[]>([]);
  const [favorites, setFavorites] = React.useState<CptCode[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 300);
  const { token } = useAuth();

  const loadFavorites = React.useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/medical-coding/cpt-favorites`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data: CptFavoriteResponse[] = await res.json();
        setFavorites(data.map((fav) => fav.cptCode));
      }
    } catch (error) {
      console.error("Failed to load CPT favorites:", error);
    }
  }, [token]);

  React.useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const toggleFavorite = async (code: CptCode) => {
    const isFavorite = favorites.some((f) => f.id === code.id);

    try {
      if (isFavorite) {
        await fetch(`${API_URL}/medical-coding/cpt-favorites/${code.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setFavorites(favorites.filter((f) => f.id !== code.id));
      } else {
        await fetch(`${API_URL}/medical-coding/cpt-favorites`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ cptCodeId: code.id }),
        });
        setFavorites([...favorites, code]);
      }
    } catch (error) {
      console.error("Failed to toggle CPT favorite:", error);
    }
  };

  React.useEffect(() => {
    // Always search, even with empty query (backend returns common codes)
    const search = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${API_URL}/medical-coding/cpt-codes?search=${encodeURIComponent(debouncedQuery)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (!res.ok) {
          throw new Error(`Error ${res.status}: ${res.statusText}`);
        }
        const data = await res.json();
        setResults(data);
      } catch (err: unknown) {
        console.error("Failed to search CPT codes:", err);
        setError("Failed to fetch codes. Please try again.");
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    search();
  }, [debouncedQuery, token]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="text-muted-foreground">
            Search CPT codes (e.g. &quot;99213&quot; or &quot;Office
            visit&quot;)...
          </span>
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[650px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search procedure codes (or browse common codes)..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center p-4 py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}

            {!loading && error && (
              <div className="py-6 text-center text-sm text-destructive flex flex-col items-center gap-2">
                <AlertCircle className="h-6 w-6" />
                <p>{error}</p>
              </div>
            )}

            {!loading && !error && results.length === 0 && (
              <CommandEmpty>
                {query.length > 0
                  ? "No procedure codes found."
                  : "Start typing to search or view common codes below."}
              </CommandEmpty>
            )}

            {!query && favorites.length > 0 && !loading && !error && (
              <CommandGroup heading="Favorites">
                {favorites.map((code) => {
                  const isSelected = selectedCodes.includes(code.code);
                  return (
                    <CommandItem
                      key={code.id}
                      value={`${code.code} ${code.description}`}
                      onSelect={() => {
                        onSelect(code);
                        setOpen(false);
                        setQuery("");
                      }}
                      disabled={isSelected}
                      className="flex flex-col items-start gap-1 py-3"
                    >
                      <div className="flex w-full items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Star
                            className="h-4 w-4 text-yellow-500 fill-yellow-500 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(code);
                            }}
                          />
                          <span className="font-mono font-bold text-primary">
                            {code.code}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-xs font-normal"
                          >
                            {code.category}
                          </Badge>
                        </div>
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="flex w-full items-center justify-between text-sm text-muted-foreground">
                        <span className="line-clamp-1">{code.description}</span>
                        <span className="flex items-center gap-0.5 font-medium text-foreground">
                          <DollarSign className="h-3 w-3" />
                          {(code.price ?? 0).toFixed(2)}
                        </span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {!loading && results.length > 0 && (
              <CommandGroup heading="Search Results">
                {results.map((code) => {
                  const isSelected = selectedCodes.includes(code.code);
                  const isFavorite = favorites.some((f) => f.id === code.id);
                  return (
                    <CommandItem
                      key={code.id}
                      value={`${code.code} ${code.description}`}
                      onSelect={() => {
                        onSelect(code);
                        setOpen(false);
                        setQuery("");
                      }}
                      disabled={isSelected}
                      className="flex flex-col items-start gap-1 py-3"
                    >
                      <div className="flex w-full items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Star
                            className={`h-4 w-4 cursor-pointer ${isFavorite ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(code);
                            }}
                          />
                          <span className="font-mono font-bold text-primary">
                            {code.code}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-xs font-normal"
                          >
                            {code.category}
                          </Badge>
                        </div>
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="flex w-full items-center justify-between text-sm text-muted-foreground">
                        <span className="line-clamp-1">{code.description}</span>
                        <span className="flex items-center gap-0.5 font-medium text-foreground">
                          <DollarSign className="h-3 w-3" />
                          {(code.price ?? 0).toFixed(2)}
                        </span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
