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

  // Fetch emails for selected mailbox
  const getEmailsQuery = (mailboxId: string | null) =>
    useQuery({
      queryKey: ["emails", mailboxId],
      queryFn: () => emailService.getEmails(mailboxId!, 1, 50),
      enabled: !!mailboxId,
      retry: 1,
    });

  // Fetch email detail
  const getEmailDetailQuery = (emailId: string | null) =>
    useQuery<EmailDetail>({
      queryKey: ["email", emailId],
      queryFn: () => emailService.getEmailDetail(emailId!),
      enabled: !!emailId,
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
    getEmailsQuery,
    getEmailDetailQuery,
    modifyEmailMutation,
  };
}
