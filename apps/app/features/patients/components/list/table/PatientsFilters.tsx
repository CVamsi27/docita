import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Search } from "lucide-react";

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
            <CardTitle>All Patients</CardTitle>
            <CardDescription>
              A list of all patients in your practice including their name,
              contact, and medical history
            </CardDescription>
          </div>
          <Tabs
            value={filterType}
            onValueChange={(v) => onFilterChange(v as "all" | "recent" | "new")}
            className="w-full md:w-[400px]"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="recent">Recently Active</TabsTrigger>
              <TabsTrigger value="new">New Patients</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone"
              className="pl-9 bg-background"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSearchChange("")}
            >
              Clear
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
