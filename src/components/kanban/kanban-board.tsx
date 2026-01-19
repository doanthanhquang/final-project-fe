import { useState, useMemo, useEffect } from "react";
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
import { KanbanSettingsModal } from "./kanban-settings-modal";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ErrorState } from "@/components/error-state";
import type { EmailCardData, ColumnId, KanbanColumn as KanbanColumnType } from "@/types/kanban";
import { kanbanConfigService } from "@/services/kanban-config";

interface KanbanBoardProps {
  emailsByColumn: Record<ColumnId, EmailCardData[]>;
  onEmailMove: (emailId: string, newColumnId: ColumnId) => void;
  onEmailClick?: (emailId: string) => void;
  onSnoozeClick?: (emailId: string) => void;
  onUnsnoozeClick?: (emailId: string) => void;
  filters?: FilterOptions;
  onFiltersChange?: (filters: FilterOptions) => void;
}

export function KanbanBoard({
  emailsByColumn,
  onEmailMove,
  onEmailClick,
  onSnoozeClick,
  onUnsnoozeClick,
  filters: externalFilters,
  onFiltersChange: externalOnFiltersChange,
}: KanbanBoardProps) {
  const [activeEmail, setActiveEmail] = useState<EmailCardData | null>(null);
  const [activeMobileTab, setActiveMobileTab] = useState<ColumnId>("inbox");
  const [sortOption, setSortOption] = useState<SortOption>(null);
  const [internalFilters, setInternalFilters] = useState<FilterOptions>({
    unreadOnly: 0,
    hasAttachments: 0,
  });

  // Use external filters if provided, otherwise use internal state
  const filters = externalFilters ?? internalFilters;
  const setFilters = externalOnFiltersChange ?? setInternalFilters;
  const [columns, setColumns] = useState<KanbanColumnType[]>([]);
  const [isLoadingColumns, setIsLoadingColumns] = useState(true);
  const [columnsError, setColumnsError] = useState<string | null>(null);

  // Load columns from API
  useEffect(() => {
    loadColumns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadColumns = async () => {
    setIsLoadingColumns(true);
    try {
      const configColumns = await kanbanConfigService.getColumns();

      // Transform API columns to UI columns format
      const uiColumns: KanbanColumnType[] = configColumns.map((col) => ({
        id: col.column_id as ColumnId,
        title: col.column_name.toUpperCase(),
        color: getColumnColor(col.column_id),
      }));

      setColumns(uiColumns);
      setColumnsError(null);

      // Set first column as active mobile tab if available
      if (uiColumns.length > 0 && !uiColumns.find((c) => c.id === activeMobileTab)) {
        setActiveMobileTab(uiColumns[0].id);
      }
    } catch (error) {
      console.error("Failed to load columns:", error);
      setColumnsError("Failed to load Kanban columns. Please try again.");
      // Fallback to default columns
      setColumns([
        { id: "inbox", title: "INBOX", color: "border-l-blue-500" },
        { id: "todo", title: "TO DO", color: "border-l-orange-500" },
        { id: "done", title: "DONE", color: "border-l-green-500" },
      ]);
    } finally {
      setIsLoadingColumns(false);
    }
  };

  // Helper function to assign colors to columns
  const getColumnColor = (columnId: string): string => {
    const colorMap: Record<string, string> = {
      inbox: "border-l-blue-500",
      todo: "border-l-orange-500",
      in_progress: "border-l-yellow-500",
      done: "border-l-green-500",
      snoozed: "border-l-purple-500",
    };
    return colorMap[columnId] || "border-l-gray-500";
  };

  // Handle columns update from settings modal
  const handleColumnsUpdate = () => {
    loadColumns();
  };

  // Apply sorting and filtering to emails
  const processedEmailsByColumn = useMemo(() => {
    // Initialize with empty arrays for all column IDs
    const processed: Record<string, EmailCardData[]> = {};
    columns.forEach((col) => {
      processed[col.id] = [];
    });

    Object.keys(emailsByColumn).forEach((columnId) => {
      let emails = [...(emailsByColumn[columnId as ColumnId] || [])];

      // Apply filters (only senderFilter is client-side, unreadOnly and hasAttachments are handled by API)
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

      processed[columnId] = emails;
    });

    return processed as Record<ColumnId, EmailCardData[]>;
  }, [emailsByColumn, sortOption, filters, columns]);

  // Calculate email counts for each column (after filtering)
  const emailCounts: Record<ColumnId, number> = useMemo(() => {
    const counts: Record<string, number> = {};
    columns.forEach((col) => {
      counts[col.id] = processedEmailsByColumn[col.id]?.length || 0;
    });
    return counts as Record<ColumnId, number>;
  }, [columns, processedEmailsByColumn]);

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
      if (newColumnId === "snoozed" && onSnoozeClick) {
        onSnoozeClick(emailId);
      } else {
        onEmailMove(emailId, newColumnId);
      }
    }
  };

  if (isLoadingColumns) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner text="Loading columns..." />
      </div>
    );
  }

  if (columnsError) {
    return (
      <div className="h-full flex items-center justify-center">
        <ErrorState message={columnsError} onRetry={loadColumns} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Controls - Desktop Only */}
      <div className="hidden md:flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white gap-4">
        <div className="flex items-center gap-3">
          <SortControls sortOption={sortOption} onSortChange={setSortOption} />
          <KanbanSettingsModal onColumnsUpdate={handleColumnsUpdate} />
        </div>
        <FilterControls filters={filters} onFiltersChange={setFilters} />
      </div>

      {/* Mobile Tabs */}
      <KanbanTabs
        activeTab={activeMobileTab}
        onTabChange={setActiveMobileTab}
        emailCounts={emailCounts}
        columns={columns}
      />

      {/* Mobile Controls */}
      <div className="md:hidden flex flex-col gap-2 px-4 py-2 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <SortControls sortOption={sortOption} onSortChange={setSortOption} />
          <KanbanSettingsModal onColumnsUpdate={handleColumnsUpdate} />
        </div>
        <FilterControls filters={filters} onFiltersChange={setFilters} />
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* Desktop: Grid view with dynamic columns */}
        <div
          className="hidden md:grid gap-4 p-6 overflow-hidden"
          style={{
            gridTemplateColumns: `repeat(${Math.min(columns.length, 4)}, minmax(0, 1fr))`,
          }}
        >
          {columns.map((column) => (
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
