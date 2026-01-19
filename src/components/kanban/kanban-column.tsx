import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { EmailCard } from "./email-card";
import { EmptyState } from "@/components/empty-state";
import { Mail } from "lucide-react";
import type { EmailCardData, KanbanColumn as KanbanColumnType } from "@/types/kanban";

interface KanbanColumnProps {
  column: KanbanColumnType;
  emails: EmailCardData[];
  onEmailClick?: (emailId: string) => void;
  onSnoozeClick?: (emailId: string) => void;
  onUnsnoozeClick?: (emailId: string) => void;
}

export function KanbanColumn({
  column,
  emails,
  onEmailClick,
  onSnoozeClick,
  onUnsnoozeClick,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-lg overflow-hidden">
      {/* Column Header */}
      <div className="max-md:hidden flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-700">{column.title}</h2>
          <span className="bg-gray-200 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
            {emails.length}
          </span>
        </div>
      </div>

      {/* Column Content */}
      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto p-4 min-h-0 ${
          isOver ? "bg-blue-50 border-2 border-dashed border-blue-400" : ""
        }`}
      >
        <SortableContext items={emails.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          {emails.length === 0 ? (
            <EmptyState
              icon={<Mail className="h-8 w-8" />}
              title="No emails"
              description="Drag emails here to organize them"
              className="py-8"
            />
          ) : (
            emails.map((email) => (
              <EmailCard
                key={email.id}
                email={email}
                onClick={() => onEmailClick?.(email.id)}
                onSnoozeClick={(e) => {
                  e.stopPropagation();
                  onSnoozeClick?.(email.id);
                }}
                onUnsnoozeClick={(e) => {
                  e.stopPropagation();
                  onUnsnoozeClick?.(email.id);
                }}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
