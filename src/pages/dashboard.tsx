import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MailboxList } from "@/components/mailbox-list";
import { EmailList } from "@/components/email-list";
import { EmailDetail } from "@/components/email-detail";
import { EmailCompose } from "@/components/email-compose";
import { AppLayout } from "@/components/app-layout";
import { emailService } from "@/services/email";
import { Button } from "@/components/ui/button";
import { useEmailData } from "@/hooks/useEmailData";
import { useEmailActions } from "@/hooks/useEmailActions";
import { useResponsiveView } from "@/hooks/useResponsiveView";

export default function EmailInbox() {
  const queryClient = useQueryClient();
  const {
    mailboxesQuery,
    getEmailsQuery,
    getEmailDetailQuery,
    modifyEmailMutation,
  } = useEmailData();
  const {
    composeMode,
    replyToEmailId,
    forwardEmailId,
    handleCompose,
    handleReply,
    handleForward,
    handleCloseCompose,
  } = useEmailActions();
  const {
    mobileView,
    navigateToEmails,
    navigateToDetail,
    navigateToMailboxes,
  } = useResponsiveView();

  const { data: mailboxes = [], isLoading: mailboxesLoading } = mailboxesQuery;
  const [selectedMailboxId, setSelectedMailboxId] = useState<string | null>(
    null
  );
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  // Auto-select first mailbox when loaded
  const effectiveMailboxId =
    selectedMailboxId ||
    (mailboxes.length > 0
      ? (mailboxes.find((m) => m.id === "INBOX") || mailboxes[0]).id
      : null);

  const { data: emailsData, isLoading: emailsLoading } =
    getEmailsQuery(effectiveMailboxId);
  const { data: emailDetail, isLoading: emailDetailLoading } =
    getEmailDetailQuery(selectedEmailId);

  const handleModifyEmail = (
    emailId: string,
    actions: { read?: boolean; starred?: boolean; delete?: boolean }
  ) => {
    modifyEmailMutation.mutate({ emailId, actions });
    if (actions.delete) {
      setSelectedEmailId(null);
    }
  };

  // Handle connection status
  if (
    mailboxesQuery.error &&
    (mailboxesQuery.error as { response?: { status?: number } })?.response
      ?.status === 400
  ) {
    return (
      <AppLayout showDisconnect>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-4">
              No Email Provider Connected
            </h2>
            <p className="text-gray-600 mb-4">
              Please connect your Gmail account to get started.
            </p>
            <Button
              onClick={async () => {
                try {
                  const authUrl = await emailService.connectGmail();
                  window.location.href = authUrl;
                } catch (error) {
                  console.error("Failed to initiate Gmail connection:", error);
                }
              }}
            >
              Connect Gmail
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const handleDisconnectProvider = async () => {
    try {
      await emailService.disconnectProvider();
      queryClient.invalidateQueries({ queryKey: ["mailboxes"] });
      // This will trigger the error state and show the connection screen
    } catch (error) {
      console.error("Failed to disconnect provider:", error);
    }
  };

  return (
    <AppLayout showDisconnect onDisconnect={handleDisconnectProvider}>
      <div className="flex h-full relative">
        {/* Mailbox List - Always visible on mobile at start */}
        <div
          className={`
          ${mobileView === "mailboxes" ? "flex" : "hidden"}
          md:flex
          flex-col
          w-full md:w-64
          border-r border-gray-200
        `}
        >
          <MailboxList
            mailboxes={mailboxes}
            selectedMailboxId={effectiveMailboxId}
            onSelectMailbox={(id) => {
              setSelectedMailboxId(id);
              setSelectedEmailId(null);
              navigateToEmails();
            }}
            loading={mailboxesLoading}
          />
        </div>

        {/* Email List - Responsive visibility */}
        <div
          className={`
          ${mobileView === "emails" ? "flex" : "hidden"}
          md:flex
          flex-col
          w-full md:w-96 lg:flex-1
          border-r border-gray-200
        `}
        >
          <EmailList
            emails={emailsData?.data || []}
            selectedEmailId={selectedEmailId}
            onSelectEmail={(id) => {
              setSelectedEmailId(id);
              navigateToDetail();
              const email = emailsData?.data.find((e) => e.id === id);
              if (email && !email.read) {
                handleModifyEmail(id, { read: true });
              }
            }}
            loading={emailsLoading}
            onBack={navigateToMailboxes}
            showBackButton={true}
          />
        </div>

        {/* Email Detail - Full screen on mobile */}
        <div
          className={`
          ${mobileView === "detail" && selectedEmailId ? "flex" : "hidden"}
          lg:flex
          flex-col
          w-full lg:flex-[2]
        `}
        >
          <EmailDetail
            email={emailDetail || null}
            loading={emailDetailLoading}
            onReply={handleReply}
            onForward={handleForward}
            onModify={handleModifyEmail}
            onBack={navigateToEmails}
            showBackButton={true}
          />
        </div>

        {/* Compose Button - Fixed position with higher z-index */}
        <button
          onClick={handleCompose}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-full shadow-2xl transition-all hover:scale-105"
          aria-label="Compose email"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span className="hidden sm:inline">Compose</span>
        </button>

        {/* Compose Modal */}
        <EmailCompose
          open={composeMode !== null}
          onClose={handleCloseCompose}
          mode={composeMode || "compose"}
          replyToEmailId={replyToEmailId || undefined}
          forwardEmailId={forwardEmailId || undefined}
          initialSubject={
            composeMode === "reply"
              ? `Re: ${emailDetail?.subject || ""}`
              : composeMode === "forward"
              ? `Fwd: ${emailDetail?.subject || ""}`
              : undefined
          }
          initialBody={
            composeMode === "reply"
              ? `\n\n--- Original Message ---\nFrom: ${
                  emailDetail?.from.email
                }\nDate: ${emailDetail?.date}\n\n${
                  emailDetail?.body_text || ""
                }`
              : composeMode === "forward"
              ? `\n\n--- Forwarded Message ---\nFrom: ${
                  emailDetail?.from.email
                }\nDate: ${emailDetail?.date}\nSubject: ${
                  emailDetail?.subject
                }\n\n${emailDetail?.body_text || ""}`
              : undefined
          }
          initialTo={
            composeMode === "reply" ? [emailDetail?.from.email || ""] : []
          }
        />
      </div>
    </AppLayout>
  );
}
