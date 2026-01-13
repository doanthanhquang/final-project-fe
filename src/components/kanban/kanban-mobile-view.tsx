import { type EmailCardData, type ColumnId, KANBAN_COLUMNS } from "@/types/kanban";
import { KanbanColumn } from "./kanban-column";

interface KanbanMobileViewProps {
  activeColumn: ColumnId;
  emails: EmailCardData[];
  onEmailClick?: (emailId: string) => void;
  onSnoozeClick?: (emailId: string) => void;
  onUnsnoozeClick?: (emailId: string) => void;
}

export function KanbanMobileView({
  activeColumn,
  emails,
  onEmailClick,
  onSnoozeClick,
  onUnsnoozeClick,
}: KanbanMobileViewProps) {
  // Find column from KANBAN_COLUMNS, or create snoozed column if needed
  let column = KANBAN_COLUMNS.find((col) => col.id === activeColumn);

  // Handle snoozed column (not in KANBAN_COLUMNS for desktop)
  if (!column && activeColumn === "snoozed") {
    column = {
      id: "snoozed",
      title: "SNOOZED",
      color: "border-l-purple-500",
    };
  }

  if (!column) {
    return null;
  }

  return (
    <div className="h-full md:hidden">
      <KanbanColumn
        column={column}
        emails={emails}
        onEmailClick={onEmailClick}
        onSnoozeClick={onSnoozeClick}
        onUnsnoozeClick={onUnsnoozeClick}
      />
    </div>
  );
}
