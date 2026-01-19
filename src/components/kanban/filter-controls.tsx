import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface FilterOptions {
  unreadOnly: boolean;
  hasAttachments: boolean;
  senderFilter?: string;
}

interface FilterControlsProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
}

export function FilterControls({ filters, onFiltersChange }: FilterControlsProps) {
  const toggleUnreadOnly = () => {
    onFiltersChange({
      ...filters,
      unreadOnly: !filters.unreadOnly,
    });
  };

  const toggleHasAttachments = () => {
    onFiltersChange({
      ...filters,
      hasAttachments: !filters.hasAttachments,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      unreadOnly: false,
      hasAttachments: false,
      senderFilter: undefined,
    });
  };

  const hasActiveFilters = filters.unreadOnly || filters.hasAttachments || filters.senderFilter;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-sm text-gray-600">Filter:</span>
      <Button
        variant={filters.unreadOnly ? "default" : "outline"}
        size="sm"
        onClick={toggleUnreadOnly}
        className="h-7 px-3 text-xs"
      >
        {filters.unreadOnly && <Check className="h-3 w-3 mr-1" />}
        Unread Only
      </Button>
      <Button
        variant={filters.hasAttachments ? "default" : "outline"}
        size="sm"
        onClick={toggleHasAttachments}
        className="h-7 px-3 text-xs"
      >
        {filters.hasAttachments && <Check className="h-3 w-3 mr-1" />}
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
