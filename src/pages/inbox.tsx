import { useState, useEffect, useMemo } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { MailboxList } from "@/components/mailbox-list";
import { EmailList } from "@/components/email-list";
import { EmailDetail } from "@/components/email-detail";
import { AppLayout } from "@/components/app-layout";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { ViewModeToggle } from "@/components/view-mode-toggle";
import { SnoozeDialog } from "@/components/snooze-dialog";
import { SnoozePanel } from "@/components/kanban/snooze-panel";
import { SearchBar } from "@/components/search-bar";
import { SearchResults } from "@/components/search-results";
import { emailService } from "@/services/email";
import { workflowService } from "@/services/workflow";
import { Button } from "@/components/ui/button";
import { useEmailData, useEmails, useEmailDetail } from "@/hooks/useEmailData";
import { useResponsiveView } from "@/hooks/useResponsiveView";
import { useWorkflow } from "@/hooks/useWorkflow";
import type { EmailCardData, ColumnId } from "@/types/kanban";
import { cn } from "@/lib/utils";

export default function EmailInbox() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"list" | "kanban">(() => {
    const savedMode = localStorage.getItem("email-view-mode");
    return savedMode === "list" || savedMode === "kanban" ? savedMode : "kanban";
  });

  const { mailboxesQuery, modifyEmailMutation } = useEmailData();
  const { mobileView, navigateToEmails, navigateToDetail, navigateToMailboxes } =
    useResponsiveView();

  const { workflowStatesQuery, moveEmailMutation, initializeEmailMutation } = useWorkflow();

  const { data: mailboxes = [], isLoading: mailboxesLoading } = mailboxesQuery;
  const [selectedMailboxId, setSelectedMailboxId] = useState<string | null>(null);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [snoozeDialogOpen, setSnoozeDialogOpen] = useState(false);
  const [snoozePanelOpen, setSnoozePanelOpen] = useState(false);
  const [emailToSnooze, setEmailToSnooze] = useState<{ id: string; subject: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);

  // Auto-select first mailbox when loaded
  const effectiveMailboxId =
    selectedMailboxId ||
    (mailboxes.length > 0 ? (mailboxes.find((m) => m.id === "INBOX") || mailboxes[0]).id : null);

  const { data: emailsData, isLoading: emailsLoading } = useEmails(effectiveMailboxId);
  const { data: emailDetail, isLoading: emailDetailLoading } = useEmailDetail(selectedEmailId);

  // Search query
  const searchQueryResult = useQuery({
    queryKey: ["emailSearch", searchQuery],
    queryFn: () => emailService.searchEmails(searchQuery, {}, 1, 50, true),
    enabled: isSearching && searchQuery.length > 0,
  });

  // Initialize workflow states for new emails
  useEffect(() => {
    if (emailsData?.data && viewMode === "kanban") {
      emailsData.data.forEach((email) => {
        const hasWorkflowState = workflowStatesQuery.data?.data
          ? Object.values(workflowStatesQuery.data.data)
            .flat()
            .some((state) => state.email_id === email.id)
          : false;

        if (!hasWorkflowState) {
          initializeEmailMutation.mutate(email.id);
        }
      });
    }
  }, [emailsData?.data, viewMode, workflowStatesQuery.data, initializeEmailMutation]);

  // Prepare email data for Kanban board
  const emailsByColumn = useMemo(() => {
    const columns: Record<ColumnId, EmailCardData[]> = {
      inbox: [],
      todo: [],
      in_progress: [],
      done: [],
      snoozed: [],
    };

    if (!workflowStatesQuery.data?.data || !emailsData?.data) {
      return columns;
    }

    const workflowStates = workflowStatesQuery.data.data;
    const emails = emailsData.data;

    // Map emails to their workflow states
    emails.forEach((email) => {
      const state = Object.values(workflowStates)
        .flat()
        .find((s) => s.email_id === email.id);

      const columnId = (state?.column_id as ColumnId) || "inbox";

      const cardData: EmailCardData = {
        id: email.id,
        sender: {
          name: email.from,
          email: email.from,
        },
        subject: email.subject,
        summary: `From ${email.from}: ${email.subject}`,
        date: email.date,
        read: email.read,
        hasAttachments: email.has_attachments,
        workflowState: state,
      };

      if (columns[columnId]) {
        columns[columnId].push(cardData);
      }
    });

    return columns;
  }, [workflowStatesQuery.data, emailsData]);

  const handleModifyEmail = (
    emailId: string,
    actions: { read?: boolean; starred?: boolean; delete?: boolean }
  ) => {
    modifyEmailMutation.mutate({ emailId, actions });
    if (actions.delete) {
      setSelectedEmailId(null);
    }
  };

  const handleEmailMove = (emailId: string, newColumnId: ColumnId) => {
    moveEmailMutation.mutate(
      { emailId, columnId: newColumnId },
      {
        onSuccess: () => {
          console.log(`Email ${emailId} moved to ${newColumnId}`);
        },
      }
    );
  };

  const handleEmailClick = (emailId: string) => {
    setSelectedEmailId(emailId);
    // Switch to list view to show email detail
    setViewMode("list");
    localStorage.setItem("email-view-mode", "list");
    navigateToDetail();

    // Mark email as read if unread
    const email = emailsData?.data.find((e) => e.id === emailId);
    if (email && !email.read) {
      handleModifyEmail(emailId, { read: true });
    }
  };

  // Snooze mutation
  const snoozeMutation = useMutation({
    mutationFn: ({
      emailId,
      snoozeUntil,
      quickOption,
    }: {
      emailId: string;
      snoozeUntil?: string;
      quickOption?: string;
    }) =>
      workflowService.snoozeEmail(emailId, {
        snooze_until: snoozeUntil,
        quick_option: quickOption as
          | "later_today"
          | "tomorrow"
          | "this_weekend"
          | "next_week"
          | undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflowStates"] });
      queryClient.invalidateQueries({ queryKey: ["emails"] });
    },
  });

  // Unsnooze mutation
  const unsnoozeMutation = useMutation({
    mutationFn: (emailId: string) => workflowService.unsnoozeEmail(emailId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflowStates"] });
      queryClient.invalidateQueries({ queryKey: ["emails"] });
    },
  });

  const handleSnoozeClick = (emailId: string) => {
    const email = emailsData?.data.find((e) => e.id === emailId);
    if (email) {
      setEmailToSnooze({ id: emailId, subject: email.subject });
      setSnoozeDialogOpen(true);
    }
  };

  const handleSnooze = (snoozeUntil?: string, quickOption?: string) => {
    if (emailToSnooze) {
      snoozeMutation.mutate({
        emailId: emailToSnooze.id,
        snoozeUntil,
        quickOption,
      });
      setSnoozeDialogOpen(false);
      setEmailToSnooze(null);
    }
  };

  const handleUnsnooze = (emailId: string) => {
    unsnoozeMutation.mutate(emailId);
  };

  // Save view mode preference to localStorage
  const handleViewModeChange = (mode: "list" | "kanban") => {
    setViewMode(mode);
    localStorage.setItem("email-view-mode", mode);
  };

  // Search handlers
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setIsSearching(true);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setIsSearching(false);
  };

  // Convert search results to EmailCardData format
  const searchResults = useMemo(() => {
    if (!searchQueryResult.data?.data) {
      return [];
    }

    return searchQueryResult.data.data.map((email) => {
      // Extract sender name and email
      const fromMatch = email.from.match(/^(.+?)\s*<(.+?)>$|^(.+)$/);
      const senderName = fromMatch ? fromMatch[1] || fromMatch[3] || email.from : email.from;
      const senderEmail = fromMatch ? fromMatch[2] || email.from : email.from;

      return {
        id: email.id,
        sender: {
          name: senderName,
          email: senderEmail,
        },
        subject: email.subject,
        summary: `From ${email.from}: ${email.subject}`,
        date: email.date,
        read: email.read,
        hasAttachments: email.has_attachments || false,
        relevance_score: email.relevance_score,
      } as EmailCardData & { relevance_score?: number };
    });
  }, [searchQueryResult.data]);

  // Handle connection status
  if (
    mailboxesQuery.error &&
    (mailboxesQuery.error as { response?: { status?: number } })?.response?.status === 400
  ) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-4">No Email Provider Connected</h2>
            <p className="text-gray-600 mb-4">Please connect your Gmail account to get started.</p>
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

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header with Search Bar and View Mode Toggle */}
        <div className="flex flex-col gap-3 px-6 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">AI Email Flow</h1>
            <div className="flex flex-row gap-2 items-center">
              <ViewModeToggle mode={viewMode} onModeChange={handleViewModeChange} />
              {/* Snooze Button - Desktop Only */}
              <button
                onClick={() => setSnoozePanelOpen(true)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border-2",
                  "text-purple-700 font-medium shadow-sm max-md:hidden"
                )}
              >
                <Clock className="w-5 h-5" />
                <span>Snooze</span>
                <span className="inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 text-xs font-bold rounded-full bg-purple-600 text-white">
                  {emailsByColumn.snoozed.length}
                </span>
              </button>
            </div>
          </div>
          <SearchBar
            onSearch={handleSearch}
            onClear={handleClearSearch}
            placeholder="Search emails (fuzzy search enabled)..."
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {isSearching ? (
            <div className="h-full p-6">
              <SearchResults
                results={searchResults}
                query={searchQuery}
                isLoading={searchQueryResult.isLoading}
                error={searchQueryResult.error ? "Failed to search emails" : null}
                onClear={handleClearSearch}
                onEmailClick={handleEmailClick}
              />
            </div>
          ) : viewMode === "kanban" ? (
            <KanbanBoard
              emailsByColumn={emailsByColumn}
              onEmailMove={handleEmailMove}
              onEmailClick={handleEmailClick}
              onSnoozeClick={handleSnoozeClick}
              onUnsnoozeClick={handleUnsnooze}
            />
          ) : (
            <div className="flex h-full relative">
              {/* Traditional List View */}
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

              <div
                className={`
                ${mobileView === "emails" ? "flex" : "hidden"}
                md:flex
                flex-col
                w-full md:max-w-96 md:w-[30%]
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

              <div
                className={`${mobileView === "detail" && selectedEmailId ? "flex" : "hidden"} lg:flex flex-col w-full md:min-w-100 lg:flex-[2]`}
              >
                <EmailDetail
                  email={emailDetail || null}
                  loading={emailDetailLoading}
                  onModify={handleModifyEmail}
                  onBack={navigateToEmails}
                  showBackButton={true}
                />
              </div>
            </div>
          )}
        </div>

        {/* Snooze Dialog */}
        {emailToSnooze && (
          <SnoozeDialog
            isOpen={snoozeDialogOpen}
            onClose={() => {
              setSnoozeDialogOpen(false);
              setEmailToSnooze(null);
            }}
            onSnooze={handleSnooze}
            emailSubject={emailToSnooze.subject}
          />
        )}

        {/* Snooze Panel - Desktop Only */}
        {viewMode === "kanban" && (
          <SnoozePanel
            isOpen={snoozePanelOpen}
            onClose={() => setSnoozePanelOpen(false)}
            emails={emailsByColumn.snoozed || []}
            onEmailClick={handleEmailClick}
            onUnsnoozeClick={handleUnsnooze}
          />
        )}
      </div>
    </AppLayout>
  );
}
