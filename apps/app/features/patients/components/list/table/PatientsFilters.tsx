import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/navigation/tabs";
import { Input } from "@workspace/ui/components/form/input";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { Search, X } from "lucide-react";

interface PatientsFiltersProps {
  filterType: "all" | "recent" | "new";
  onFilterChange: (value: "all" | "recent" | "new") => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export function PatientsFilters({
  filterType,
  onFilterChange,
  searchQuery,
  onSearchChange,
}: PatientsFiltersProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle>All patients</CardTitle>
            <CardDescription>
              A list of all patients in your practice including their name,
              contact, and medical history
            </CardDescription>
          </div>
          <Tabs
            value={filterType}
            onValueChange={(v) => {
              if (v === "all" || v === "recent" || v === "new")
                onFilterChange(v);
            }}
            className="w-full min-w-0 sm:w-auto md:max-w-[400px]"
          >
            <TabsList className="flex w-full overflow-x-auto overscroll-x-contain [scrollbar-width:thin] max-md:flex-nowrap md:grid md:grid-cols-3">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="recent">Recently active</TabsTrigger>
              <TabsTrigger value="new">New patients</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex w-full min-w-0 flex-wrap items-center gap-4 mb-6">
          <div className="relative min-w-0 flex-1 w-full sm:max-w-sm">
            <Search
              className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
              aria-hidden
            />
            <Input
              placeholder="Enter name or phone"
              className={`bg-background pl-9${searchQuery.trim() ? " pr-10" : ""}`}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Search patients"
            />
            {searchQuery.trim() ? (
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                <SymbolTooltip label="Clear search">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onSearchChange("")}
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </Button>
                </SymbolTooltip>
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
