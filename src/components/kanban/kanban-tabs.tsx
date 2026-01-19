import { type ColumnId, type KanbanColumn } from "@/types/kanban";
import { cn } from "@/lib/utils";

interface KanbanTabsProps {
  activeTab: ColumnId;
  onTabChange: (tab: ColumnId) => void;
  emailCounts: Record<ColumnId, number>;
  columns: KanbanColumn[];
}

// Helper function to get icon and label for a column
const getColumnDisplayInfo = (columnId: ColumnId, columnTitle: string) => {
  const iconMap: Record<string, string> = {
    inbox: "📥",
    todo: "📝",
    done: "✅",
    snoozed: "⏰",
  };

  // Use column title from API, but format it nicely
  const label = columnTitle
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  return {
    icon: iconMap[columnId] || "📋",
    label: label || columnTitle,
  };
};

export function KanbanTabs({ activeTab, onTabChange, emailCounts, columns }: KanbanTabsProps) {
  return (
    <div className="md:hidden border-b border-gray-200 bg-white sticky top-0 z-10">
      <div className="flex overflow-x-auto scrollbar-hide">
        {columns.map((column) => {
          const count = emailCounts[column.id] || 0;
          const isActive = activeTab === column.id;
          const { icon, label } = getColumnDisplayInfo(column.id, column.title);

          return (
            <button
              key={column.id}
              onClick={() => onTabChange(column.id)}
              className={cn(
                "flex-1 min-w-[100px] px-4 py-3 text-sm font-medium transition-colors relative",
                "focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500",
                isActive
                  ? column.id === "snoozed"
                    ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50"
                    : "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <span>{icon}</span>
                <span>{label}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      "inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full",
                      isActive
                        ? column.id === "snoozed"
                          ? "bg-purple-600 text-white"
                          : "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700"
                    )}
                  >
                    {count}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
