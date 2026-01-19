import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface FilterOptions {
  unreadOnly: number;
  hasAttachments: number;
  senderFilter?: string;
}

interface FilterControlsProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
}

export function FilterControls({ filters, onFiltersChange }: FilterControlsProps) {
  const toggleUnreadOnly = () => {
    console.log("toggleUnreadOnly", filters.unreadOnly);
    onFiltersChange({
      ...filters,
      unreadOnly: !filters.unreadOnly ? 1 : 0,
    });
  };

  const toggleHasAttachments = () => {
    onFiltersChange({
      ...filters,
      hasAttachments: !filters.unreadOnly ? 1 : 0,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      unreadOnly: 0,
      hasAttachments: 0,
      senderFilter: undefined,
    });
  };

  const hasActiveFilters = filters.unreadOnly || filters.hasAttachments || filters.senderFilter;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-sm text-gray-600">Filter:</span>
      <Button
        variant={filters.unreadOnly === 1 ? "default" : "outline"}
        size="sm"
        onClick={toggleUnreadOnly}
        className="h-7 px-3 text-xs"
      >
        {!!filters.unreadOnly && <Check className="h-3 w-3 mr-1" />}
        Unread Only
      </Button>
      <Button
        variant={filters.hasAttachments ? "default" : "outline"}
        size="sm"
        onClick={toggleHasAttachments}
        className="h-7 px-3 text-xs"
      >
        {!!filters.hasAttachments && <Check className="h-3 w-3 mr-1" />}
        With Attachments
      </Button>
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-7 px-2 text-xs text-gray-600"
        >
          Clear
        </Button>
      )}
    </div>
  );
}
