import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workflowService } from "@/services/workflow";
import type { ColumnId, EmailCardData } from "@/types/kanban";

export function useWorkflow() {
  const queryClient = useQueryClient();

  const workflowStatesQuery = useQuery({
    queryKey: ["workflow-states"],
    queryFn: () => workflowService.getWorkflowStates(),
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const moveEmailMutation = useMutation({
    mutationFn: ({ emailId, columnId }: { emailId: string; columnId: ColumnId }) =>
      workflowService.updateWorkflowState(emailId, { column_id: columnId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-states"] });
    },
  });

  const initializeEmailMutation = useMutation({
    mutationFn: (emailId: string) => workflowService.initializeEmail(emailId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-states"] });
    },
  });

  const snoozeEmailMutation = useMutation({
    mutationFn: ({
      emailId,
      quickOption,
    }: {
      emailId: string;
      quickOption: "later_today" | "tomorrow" | "this_weekend" | "next_week";
    }) => workflowService.snoozeEmail(emailId, { quick_option: quickOption }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-states"] });
    },
  });

  return {
    workflowStatesQuery,
    moveEmailMutation,
    initializeEmailMutation,
    snoozeEmailMutation,
  };
}
