"use client";

import * as React from "react";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";

export interface SearchItem {
  id: string;
  label: string;
  group?: string;
}

export interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  placeholder?: string;
  items: SearchItem[];
  onSelect: (item: SearchItem) => void;
  isLoading?: boolean;
  emptyText?: string;
}

/**
 * SearchDialog is a specialized dialog for searching and selecting items.
 * Use this for large lists where filtering is beneficial.
 *
 * @example
 * ```tsx
 * <SearchDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Select Patient"
 *   placeholder="Search patients..."
 *   items={patients}
 *   onSelect={(patient) => setSelected(patient)}
 * />
 * ```
 */
export function SearchDialog({
  open,
  onOpenChange,
  title,
  description,
  placeholder = "Search...",
  items,
  onSelect,
  isLoading = false,
  emptyText = "No items found.",
}: SearchDialogProps) {
  const [value, setValue] = React.useState("");

  const handleSelect = (item: SearchItem) => {
    onSelect(item);
    onOpenChange(false);
  };

  // Group items by category if groups are specified
  const groupedItems = React.useMemo(() => {
    const groups: Record<string, SearchItem[]> = {};
    
    items.forEach((item) => {
      const groupName = item.group || "Other";
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(item);
    });

    return groups;
  }, [items]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-lg sm:rounded-lg">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <Command shouldFilter={false} className="[&_[cmdk-input]]:h-12">
          <CommandInput
            placeholder={placeholder}
            value={value}
            onValueChange={setValue}
            disabled={isLoading}
            className="border-0"
          />
          <CommandList>
            <CommandEmpty>{isLoading ? "Loading..." : emptyText}</CommandEmpty>

            {Object.entries(groupedItems).map(([group, groupItems]) => (
              <CommandGroup key={group} heading={group}>
                {groupItems.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    onSelect={() => handleSelect(item)}
                    className="aria-selected:bg-primary aria-selected:text-primary-foreground"
                  >
                    <Check className="mr-2 h-4 w-4 opacity-0 aria-selected:opacity-100" />
                    <span className="flex-1">{item.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
