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
            placeholder="Search ICD-10 codes (or browse common codes)..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? (
                <div className="py-6 text-center text-sm">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
                    <p className="font-medium">Searching diagnoses...</p>
                    <p className="text-xs text-muted-foreground">
                      This may take a moment
                    </p>
                  </div>
                </div>
              ) : error ? (
                <div className="py-6 text-center text-sm">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                      <span className="text-destructive text-xl">⚠</span>
                    </div>
                    <p className="font-medium text-destructive">
                      Error loading diagnoses
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Please check your connection or try again
                    </p>
                  </div>
                </div>
              ) : searchQuery.length > 0 && searchQuery.length < 2 ? (
                <div className="py-6 text-center text-sm">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-muted-foreground">
                      Type at least 2 characters to search
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-sm">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="h-8 w-8 text-muted-foreground/50" />
                    <p className="font-medium text-muted-foreground">
                      No diagnosis found
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Try different keywords or check spelling
                    </p>
                  </div>
                </div>
              )}
            </CommandEmpty>

            {!searchQuery && !favLoading && favorites.length > 0 && (
              <CommandGroup heading="Favorites">
                {favorites.map((code) => (
                  <CommandItem
                    key={code.id}
                    value={`${code.code} ${code.description}`}
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
                    value={`${code.code} ${code.description}`}
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
