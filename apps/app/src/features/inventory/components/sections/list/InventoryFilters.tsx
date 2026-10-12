import { useTranslation } from "react-i18next";
import {
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components";

interface InventoryFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  stockFilter: string;
  setStockFilter: (status: string) => void;
  uniqueCategories: string[];
}

export function InventoryFilters({
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  stockFilter,
  setStockFilter,
  uniqueCategories,
}: InventoryFiltersProps) {
  const { t } = useTranslation("Inventory.filters");
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <SearchInput
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onClear={() => setSearchQuery("")}
        placeholder={t("searchPlaceholder")}
        ariaLabel={t("searchAriaLabel")}
      />
      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
        <SelectTrigger
          className="w-full md:w-[180px]"
          aria-label={t("categoryPlaceholder")}
        >
          <SelectValue placeholder={t("categoryPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allCategories")}</SelectItem>
          {uniqueCategories.map((category) => (
            <SelectItem key={category} value={category}>
              {category}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={stockFilter} onValueChange={setStockFilter}>
        <SelectTrigger
          className="w-full md:w-[180px]"
          aria-label={t("stockPlaceholder")}
        >
          <SelectValue placeholder={t("stockPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allStatus")}</SelectItem>
          <SelectItem value="low_critical">{t("lowCritical")}</SelectItem>
          <SelectItem value="in_stock">{t("inStock")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
