"use client";

import { useState } from "react";
import { ChevronsUpDown, Search, Star } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
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

import { apiHooks } from "@/lib/api-hooks";
import type { IcdCode } from "@/types";
import { useDebounce } from "@/hooks/use-debounce";

interface IcdCodeSearchProps {
  onSelect: (code: IcdCode) => void;
  placeholder?: string;
  className?: string;
}

interface IcdFavoriteResponse {
  icdCode?: IcdCode;
  [key: string]: unknown;
}

export function IcdCodeSearch({
  onSelect,
  placeholder = "Search diagnosis...",
  className,
}: IcdCodeSearchProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data: favoritesData = [], isLoading: favLoading } =
    apiHooks.useICDFavorites();
  const {
    data: codes = [],
    isLoading: loading,
    error,
  } = apiHooks.useSearchIcdCodes(debouncedSearch);

  // Extract icdCode from favorites response (API returns { icdCode: {...} })
  const favorites = (favoritesData as IcdFavoriteResponse[])
    .map((fav) => fav.icdCode || (fav as unknown as IcdCode))
    .filter(Boolean) as IcdCode[];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {value ? value : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[650px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type 2+ characters to search ICD-10 codes..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? (
                <div className="py-6 text-center text-sm">
                  <div className="animate-pulse">Searching diagnoses...</div>
                </div>
              ) : error ? (
                <div className="py-6 text-center text-sm text-destructive">
                  <p className="font-medium">Error loading diagnoses</p>
                  <p className="text-xs mt-1">
                    Please try again or contact support
                  </p>
                </div>
              ) : searchQuery.length > 0 && searchQuery.length < 2 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Type at least 2 characters to search
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No diagnosis found. Try a different search term.
                </div>
              )}
            </CommandEmpty>

            {!searchQuery && !favLoading && favorites.length > 0 && (
              <CommandGroup heading="Favorites">
                {favorites.map((code) => (
                  <CommandItem
                    key={code.id}
                    value={code.code}
                    onSelect={() => {
                      onSelect(code);
                      setValue(`${code.code} - ${code.description}`);
                      setOpen(false);
                    }}
                  >
                    <Star className="mr-2 h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-mono font-bold mr-2">
                      {code.code}
                    </span>
                    <span className="truncate">{code.description}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {!loading && codes.length > 0 && (
              <CommandGroup heading="Search Results">
                {codes.map((code: IcdCode) => (
                  <CommandItem
                    key={code.id}
                    value={code.code}
                    onSelect={() => {
                      onSelect(code);
                      setValue(`${code.code} - ${code.description}`);
                      setOpen(false);
                    }}
                  >
                    <Search className="mr-2 h-4 w-4 opacity-50" />
                    <span className="font-mono font-bold mr-2">
                      {code.code}
                    </span>
                    <span className="truncate">{code.description}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
