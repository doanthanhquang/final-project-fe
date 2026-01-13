import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { EmailCard } from "./email-card";
import type { EmailCardData, KanbanColumn as KanbanColumnType } from "@/types/kanban";

interface KanbanColumnProps {
  column: KanbanColumnType;
  emails: EmailCardData[];
  onEmailClick?: (emailId: string) => void;
  onSnoozeClick?: (emailId: string) => void;
  onUnsnoozeClick?: (emailId: string) => void;
}

export function KanbanColumn({ column, emails, onEmailClick, onSnoozeClick, onUnsnoozeClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-lg overflow-hidden">
      {/* Column Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-700">{column.title}</h2>
          <span className="bg-gray-200 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
            {emails.length}
          </span>
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
            <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
          </svg>
        </button>
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
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <svg
                className="w-12 h-12 mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <p className="text-sm">No emails here</p>
            </div>
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
