import { type ColumnId } from "@/types/kanban";
import { cn } from "@/lib/utils";

interface KanbanTabsProps {
  activeTab: ColumnId;
  onTabChange: (tab: ColumnId) => void;
  emailCounts: Record<ColumnId, number>;
}

const TAB_CONFIG = [
  { id: "inbox" as ColumnId, label: "Inbox", icon: "📥" },
  { id: "todo" as ColumnId, label: "To Do", icon: "📝" },
  { id: "done" as ColumnId, label: "Done", icon: "✅" },
  { id: "snoozed" as ColumnId, label: "Snoozed", icon: "⏰" },
];

export function KanbanTabs({ activeTab, onTabChange, emailCounts }: KanbanTabsProps) {
  return (
    <div className="md:hidden border-b border-gray-200 bg-white sticky top-0 z-10">
      <div className="flex overflow-x-auto scrollbar-hide">
        {TAB_CONFIG.map((tab) => {
          const count = emailCounts[tab.id] || 0;
          const isActive = activeTab === tab.id;

          // Don't show snoozed tab if there are no snoozed emails
          if (tab.id === "snoozed" && count === 0) {
            return null;
          }

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex-1 min-w-[100px] px-4 py-3 text-sm font-medium transition-colors relative",
                "focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500",
                isActive
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      "inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full",
                      isActive ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
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
