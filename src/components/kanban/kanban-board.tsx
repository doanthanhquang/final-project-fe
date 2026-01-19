import { useState, useMemo } from "react";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { KanbanColumn } from "./kanban-column";
import { KanbanTabs } from "./kanban-tabs";
import { KanbanMobileView } from "./kanban-mobile-view";
import { EmailCard } from "./email-card";
import { SortControls, type SortOption } from "./sort-controls";
import { FilterControls, type FilterOptions } from "./filter-controls";
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
  const [sortOption, setSortOption] = useState<SortOption>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    unreadOnly: false,
    hasAttachments: false,
  });

  // Apply sorting and filtering to emails
  const processedEmailsByColumn = useMemo(() => {
    const processed: Record<ColumnId, EmailCardData[]> = {
      inbox: [],
      todo: [],
      in_progress: [],
      done: [],
      snoozed: [],
    };

    Object.keys(emailsByColumn).forEach((columnId) => {
      let emails = [...(emailsByColumn[columnId as ColumnId] || [])];

      // Apply filters
      if (filters.unreadOnly) {
        emails = emails.filter((email) => !email.read);
      }
      if (filters.hasAttachments) {
        emails = emails.filter((email) => email.hasAttachments);
      }
      if (filters.senderFilter) {
        const filterLower = filters.senderFilter.toLowerCase();
        emails = emails.filter(
          (email) =>
            email.sender.name.toLowerCase().includes(filterLower) ||
            email.sender.email.toLowerCase().includes(filterLower)
        );
      }

      // Apply sorting
      if (sortOption === "date-newest") {
        emails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      } else if (sortOption === "date-oldest") {
        emails.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      } else if (sortOption === "sender-name") {
        emails.sort((a, b) => a.sender.name.localeCompare(b.sender.name));
      }

      processed[columnId as ColumnId] = emails;
    });

    return processed;
  }, [emailsByColumn, sortOption, filters]);

  // Calculate email counts for each column (after filtering)
  const emailCounts: Record<ColumnId, number> = {
    inbox: processedEmailsByColumn.inbox?.length || 0,
    todo: processedEmailsByColumn.todo?.length || 0,
    in_progress: processedEmailsByColumn.in_progress?.length || 0,
    done: processedEmailsByColumn.done?.length || 0,
    snoozed: processedEmailsByColumn.snoozed?.length || 0,
  };

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const emailId = active.id as string;

    // Find the email being dragged
    const allEmails = Object.values(processedEmailsByColumn).flat();
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
    const currentColumn = Object.keys(processedEmailsByColumn).find((columnId) =>
      processedEmailsByColumn[columnId as ColumnId].some((e) => e.id === emailId)
    ) as ColumnId;

    if (currentColumn !== newColumnId) {
      onEmailMove(emailId, newColumnId);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Controls - Desktop Only */}
      <div className="hidden md:flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white gap-4">
        <SortControls sortOption={sortOption} onSortChange={setSortOption} />
        <FilterControls filters={filters} onFiltersChange={setFilters} />
      </div>

      {/* Mobile Tabs - Shows snoozed tab when there are snoozed emails */}
      <KanbanTabs
        activeTab={activeMobileTab}
        onTabChange={setActiveMobileTab}
        emailCounts={emailCounts}
      />

      {/* Mobile Controls */}
      <div className="md:hidden flex flex-col gap-2 px-4 py-2 border-b border-gray-200 bg-white">
        <SortControls sortOption={sortOption} onSortChange={setSortOption} />
        <FilterControls filters={filters} onFiltersChange={setFilters} />
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* Desktop: Grid view with 3 columns (no snoozed) */}
        <div className="hidden md:grid grid-cols-3 gap-4 p-6 overflow-hidden">
          {KANBAN_COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              emails={processedEmailsByColumn[column.id] || []}
              onEmailClick={onEmailClick}
              onSnoozeClick={onSnoozeClick}
              onUnsnoozeClick={onUnsnoozeClick}
            />
          ))}
        </div>

        {/* Mobile: Single column view with tabs */}
        <KanbanMobileView
          activeColumn={activeMobileTab}
          emails={processedEmailsByColumn[activeMobileTab] || []}
          onEmailClick={onEmailClick}
          onSnoozeClick={onSnoozeClick}
          onUnsnoozeClick={onUnsnoozeClick}
        />

        <DragOverlay dropAnimation={null}>
          {activeEmail ? (
            <div className="w-[350px] sm:w-[400px]">
              <EmailCard email={activeEmail} isDragOverlay={true} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
