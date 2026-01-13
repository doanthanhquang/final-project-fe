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
import { KanbanTabs } from "./kanban-tabs";
import { KanbanMobileView } from "./kanban-mobile-view";
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
  const [activeMobileTab, setActiveMobileTab] = useState<ColumnId>("inbox");

  // Calculate email counts for each column
  const emailCounts: Record<ColumnId, number> = {
    inbox: emailsByColumn.inbox?.length || 0,
    todo: emailsByColumn.todo?.length || 0,
    in_progress: emailsByColumn.in_progress?.length || 0,
    done: emailsByColumn.done?.length || 0,
    snoozed: emailsByColumn.snoozed?.length || 0,
  };

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
      {/* Mobile Tabs - Shows snoozed tab when there are snoozed emails */}
      <KanbanTabs
        activeTab={activeMobileTab}
        onTabChange={setActiveMobileTab}
        emailCounts={emailCounts}
      />

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* Desktop: Grid view with 3 columns (no snoozed) */}
        <div className="hidden md:flex flex-1 gap-4 p-6 overflow-hidden">
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

        {/* Mobile: Single column view with tabs */}
        <KanbanMobileView
          activeColumn={activeMobileTab}
          emails={emailsByColumn[activeMobileTab] || []}
          onEmailClick={onEmailClick}
          onSnoozeClick={onSnoozeClick}
          onUnsnoozeClick={onUnsnoozeClick}
        />

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
