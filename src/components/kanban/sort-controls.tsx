import { ArrowUp, ArrowDown, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export type SortOption = "date-newest" | "date-oldest" | "sender-name" | null;

interface SortControlsProps {
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
}

export function SortControls({ sortOption, onSortChange }: SortControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Sort:</span>
      <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1">
        <Button
          variant={sortOption === "date-newest" ? "default" : "ghost"}
          size="sm"
          onClick={() => onSortChange(sortOption === "date-newest" ? null : "date-newest")}
          className="h-7 px-2 text-xs"
        >
          <ArrowDown className="h-3 w-3 mr-1" />
          Newest
        </Button>
        <Button
          variant={sortOption === "date-oldest" ? "default" : "ghost"}
          size="sm"
          onClick={() => onSortChange(sortOption === "date-oldest" ? null : "date-oldest")}
          className="h-7 px-2 text-xs"
        >
          <ArrowUp className="h-3 w-3 mr-1" />
          Oldest
        </Button>
        <Button
          variant={sortOption === "sender-name" ? "default" : "ghost"}
          size="sm"
          onClick={() => onSortChange(sortOption === "sender-name" ? null : "sender-name")}
          className="h-7 px-2 text-xs"
        >
          <User className="h-3 w-3 mr-1" />
          Sender
        </Button>
      </div>
    </div>
  );
}
