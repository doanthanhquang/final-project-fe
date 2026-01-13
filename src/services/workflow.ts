import { api } from "./api";

export interface WorkflowState {
  id: number;
  user_id: number;
  email_id: string;
  column_id: string;
  position: number;
  snoozed_until: string | null;
  previous_column_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStatesResponse {
  success: boolean;
  data: {
    inbox: WorkflowState[];
    todo: WorkflowState[];
    in_progress: WorkflowState[];
    done: WorkflowState[];
    snoozed: WorkflowState[];
  };
}

export interface UpdateWorkflowStateRequest {
  column_id: string;
  position?: number;
}

export interface SnoozeEmailRequest {
  snooze_until?: string;
  quick_option?: "later_today" | "tomorrow" | "this_weekend" | "next_week";
}

export const workflowService = {
  /**
   * Get all workflow states for the authenticated user.
   */
  async getWorkflowStates(): Promise<WorkflowStatesResponse> {
    const response = await api.get<WorkflowStatesResponse>("/workflow/states");
    return response.data;
  },

  /**
   * Update workflow state (move email to different column).
   */
  async updateWorkflowState(
    emailId: string,
    data: UpdateWorkflowStateRequest
  ): Promise<{ success: boolean; data: WorkflowState }> {
    const response = await api.post(`/workflow/states/${emailId}`, data);
    return response.data;
  },

  /**
   * Initialize workflow state for an email.
   */
  async initializeEmail(emailId: string): Promise<{ success: boolean; data: WorkflowState }> {
    const response = await api.post(`/workflow/initialize/${emailId}`);
    return response.data;
  },

  /**
   * Snooze an email until a specific time.
   */
  async snoozeEmail(
    emailId: string,
    data: SnoozeEmailRequest
  ): Promise<{ success: boolean; data: WorkflowState }> {
    const response = await api.post(`/workflow/snooze/${emailId}`, data);
    return response.data;
  },

  /**
   * Unsnooze an email.
   */
  async unsnoozeEmail(emailId: string): Promise<{ success: boolean; data: WorkflowState }> {
    const response = await api.post(`/workflow/unsnooze/${emailId}`);
    return response.data;
  },

  /**
   * Get or generate email summary.
   */
  async getEmailSummary(emailId: string): Promise<{ success: boolean; data: { summary: string } }> {
    const response = await api.get(`/emails/${emailId}/summary`);
    return response.data;
  },
};
