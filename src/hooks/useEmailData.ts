import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { emailService } from "@/services/email";
import type { Mailbox, EmailDetail } from "@/services/email";

export function useEmailData() {
  const queryClient = useQueryClient();

  // Fetch mailboxes
  const mailboxesQuery = useQuery<Mailbox[]>({
    queryKey: ["mailboxes"],
    queryFn: () => emailService.getMailboxes(),
    retry: 1,
  });

  // Modify email mutation
  const modifyEmailMutation = useMutation({
    mutationFn: ({
      emailId,
      actions,
    }: {
      emailId: string;
      actions: { read?: boolean; starred?: boolean; delete?: boolean };
    }) => emailService.modifyEmail(emailId, actions),
    onSuccess: (_, variables) => {
      const { emailId } = variables;
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      queryClient.invalidateQueries({ queryKey: ["mailboxes"] });
      queryClient.invalidateQueries({ queryKey: ["email", emailId] });
    },
  });

  return {
    mailboxesQuery,
    modifyEmailMutation,
  };
}

// Separate hooks for emails and email detail
export function useEmails(mailboxId: string | null, page: number = 1, limit: number = 50) {
  return useQuery({
    queryKey: ["emails", mailboxId, page, limit],
    queryFn: () => emailService.getEmails(mailboxId!, page, limit),
    enabled: !!mailboxId,
    retry: 1,
  });
}

export function useEmailDetail(emailId: string | null) {
  return useQuery<EmailDetail>({
    queryKey: ["email", emailId],
    queryFn: () => emailService.getEmailDetail(emailId!),
    enabled: !!emailId,
    retry: 1,
  });
}
