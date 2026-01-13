import { useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { KanbanColumn } from "./kanban-column";
import { EmailCard } from "./email-card";
import type { EmailCardData, ColumnId } from "@/types/kanban";
import { KANBAN_COLUMNS } from "@/types/kanban";

interface KanbanBoardProps {
  emailsByColumn: Record<ColumnId, EmailCardData[]>;
  onEmailMove: (emailId: string, newColumnId: ColumnId) => void;
  onEmailClick?: (emailId: string) => void;
  onSnoozeClick?: (emailId: string) => void;
  onUnsnoozeClick?: (emailId: string) => void;
}

export function KanbanBoard({
  emailsByColumn,
  onEmailMove,
  onEmailClick,
  onSnoozeClick,
  onUnsnoozeClick,
}: KanbanBoardProps) {
  const [activeEmail, setActiveEmail] = useState<EmailCardData | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const emailId = active.id as string;

    // Find the email being dragged
    const allEmails = Object.values(emailsByColumn).flat();
    const email = allEmails.find((e) => e.id === emailId);
    if (email) {
      setActiveEmail(email);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveEmail(null);

    if (!over) return;

    const emailId = active.id as string;
    const newColumnId = over.id as ColumnId;

    // Check if email is being moved to a different column
    const currentColumn = Object.keys(emailsByColumn).find((columnId) =>
      emailsByColumn[columnId as ColumnId].some((e) => e.id === emailId)
    ) as ColumnId;

    if (currentColumn !== newColumnId) {
      onEmailMove(emailId, newColumnId);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 grid grid-cols-3 gap-4 p-6 overflow-hidden">
          {KANBAN_COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              emails={emailsByColumn[column.id] || []}
              onEmailClick={onEmailClick}
              onSnoozeClick={onSnoozeClick}
              onUnsnoozeClick={onUnsnoozeClick}
            />
          ))}
        </div>

        <DragOverlay>
          {activeEmail ? (
            <div className="opacity-90 cursor-grabbing">
              <EmailCard email={activeEmail} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
