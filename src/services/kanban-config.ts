import { api } from "./api";

export interface KanbanColumnConfig {
  id: number;
  user_id: number;
  column_id: string;
  column_name: string;
  gmail_label_id: string | null;
  position: number;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface KanbanColumnsResponse {
  success: boolean;
  data: KanbanColumnConfig[];
}

export interface CreateColumnRequest {
  column_name: string;
  gmail_label_id?: string | null;
}

export interface UpdateColumnRequest {
  column_name?: string;
  gmail_label_id?: string | null;
  color?: string | null;
}

export interface GmailLabel {
  id: string;
  name: string;
}

export interface GmailLabelsResponse {
  success: boolean;
  data: GmailLabel[];
}

export const kanbanConfigService = {
  /**
   * Get all Kanban columns for the authenticated user.
   */
  async getColumns(): Promise<KanbanColumnConfig[]> {
    const response = await api.get<KanbanColumnsResponse>("/kanban/columns");

    if (!response.data.success) {
      throw new Error("Failed to fetch columns");
    }

    return response.data.data || [];
  },

  /**
   * Create a new Kanban column.
   */
  async createColumn(
    columnName: string,
    gmailLabelId?: string | null
  ): Promise<KanbanColumnConfig> {
    const response = await api.post<{ success: boolean; data: KanbanColumnConfig }>(
      "/kanban/columns",
      {
        column_name: columnName,
        gmail_label_id: gmailLabelId || null,
      }
    );

    if (!response.data.success) {
      throw new Error("Failed to create column");
    }

    return response.data.data;
  },

  /**
   * Update a Kanban column.
   */
  async updateColumn(columnId: string, updates: UpdateColumnRequest): Promise<KanbanColumnConfig> {
    const response = await api.put<{ success: boolean; data: KanbanColumnConfig }>(
      `/kanban/columns/${columnId}`,
      updates
    );

    if (!response.data.success) {
      throw new Error("Failed to update column");
    }

    return response.data.data;
  },

  /**
   * Delete a Kanban column.
   */
  async deleteColumn(columnId: string): Promise<void> {
    const response = await api.delete<{ success: boolean; message?: string }>(
      `/kanban/columns/${columnId}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to delete column");
    }
  },

  /**
   * Reorder Kanban columns.
   */
  async reorderColumns(columnIds: string[]): Promise<KanbanColumnConfig[]> {
    const response = await api.post<KanbanColumnsResponse>("/kanban/columns/reorder", {
      column_ids: columnIds,
    });

    if (!response.data.success) {
      throw new Error("Failed to reorder columns");
    }

    return response.data.data || [];
  },

  /**
   * Get available Gmail labels for mapping.
   */
  async getGmailLabels(): Promise<GmailLabel[]> {
    const response = await api.get<GmailLabelsResponse>("/kanban/gmail-labels");

    if (!response.data.success) {
      throw new Error("Failed to fetch Gmail labels");
    }

    return response.data.data || [];
  },
};
