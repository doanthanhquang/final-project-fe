import type { WorkflowState } from "@/services/workflow";

export type ColumnId = "inbox" | "todo" | "in_progress" | "done" | "snoozed";

export interface KanbanColumn {
  id: ColumnId;
  title: string;
  color: string;
}

export interface EmailCardData {
  id: string;
  sender: {
    name: string;
    email: string;
  };
  subject: string;
  summary?: string;
  date: string;
  read: boolean;
  hasAttachments: boolean;
  workflowState?: WorkflowState;
}

export const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: "inbox", title: "INBOX", color: "border-l-blue-500" },
  { id: "todo", title: "TO DO", color: "border-l-orange-500" },
  { id: "done", title: "DONE", color: "border-l-green-500" },
  { id: "snoozed", title: "SNOOZED", color: "border-l-purple-500" },
];
