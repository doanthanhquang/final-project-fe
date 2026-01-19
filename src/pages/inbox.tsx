import { useState, useEffect, useMemo, useRef } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { MailboxList } from "@/components/mailbox-list";
import { EmailList } from "@/components/email-list";
import { EmailDetail } from "@/components/email-detail";
import { AppLayout } from "@/components/app-layout";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { ViewModeToggle } from "@/components/view-mode-toggle";
import { SnoozeDialog } from "@/components/snooze-dialog";
import { SnoozePanel } from "@/components/kanban/snooze-panel";
import { HybridSearchBar, type SearchMode } from "@/components/hybrid-search-bar";
import { SearchResults } from "@/components/search-results";
import { emailService, type EmailListItem } from "@/services/email";
import { workflowService } from "@/services/workflow";
import { Button } from "@/components/ui/button";
import { useEmailData, useEmails, useEmailDetail } from "@/hooks/useEmailData";
import { useResponsiveView } from "@/hooks/useResponsiveView";
import { useWorkflow } from "@/hooks/useWorkflow";
import type { EmailCardData, ColumnId } from "@/types/kanban";
import { useSearchFuzzy } from "@/contexts/use-search-fuzzy";
import { useSearchSemantic } from "@/contexts/use-search-semantic";
import { cn } from "@/lib/utils";
import { EmailCompose } from "@/components/email-compose";
import { useEmailActions } from "@/hooks/useEmailActions";
import { StatusDialog } from "@/components/status-dialog";
import { ErrorState } from "@/components/error-state";

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
  const [actualSearchMode, setActualSearchMode] = useState<SearchMode>("smart");
  const [isSearching, setIsSearching] = useState(false);
  const [emailPage, setEmailPage] = useState<number>(1);
  const emailLimit = 50;
  const [emailFilters, setEmailFilters] = useState<{
    unread_only?: number;
    has_attachments?: number;
  }>({});

  const {
    composeMode,
    replyToEmailId,
    forwardEmailId,
    handleCompose,
    handleReply,
    handleForward,
    handleCloseCompose,
  } = useEmailActions();

  const [composeInitialData, setComposeInitialData] = useState<{
    subject: string;
    body: string;
    to: string[];
  } | null>(null);

  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    title: string;
    description?: string;
  }>({
    open: false,
    title: "",
    description: "",
  });

  // Track initialized emails to prevent duplicate initialization
  const initializedEmailsRef = useRef<Set<string>>(new Set());

  // Auto-select first mailbox when loaded
  const effectiveMailboxId =
    selectedMailboxId ||
    (mailboxes.length > 0 ? (mailboxes.find((m) => m.id === "INBOX") || mailboxes[0]).id : null);

  const { data: emailsData, isLoading: emailsLoading } = useEmails(
    effectiveMailboxId,
    emailPage,
    emailLimit,
    emailFilters
  );
  const emailDetailQuery = useEmailDetail(selectedEmailId);
  const {
    data: emailDetail,
    isLoading: emailDetailLoading,
    error: emailDetailError,
  } = emailDetailQuery;

  // Search query hooks (fuzzy & semantic)
  const fuzzySearchQuery = useSearchFuzzy(searchQuery, { limit: 5, page: 1, enabled: false });
  const semanticSearchQuery = useSearchSemantic(searchQuery, { limit: 5, page: 1, enabled: false });

  // Determine which query result to use
  const searchQueryResult =
    actualSearchMode === "semantic" ? semanticSearchQuery : fuzzySearchQuery;

  // Initialize workflow states for new emails
  useEffect(() => {
    if (emailsData?.data && viewMode === "kanban" && workflowStatesQuery.data?.data) {
      const workflowStates = Object.values(workflowStatesQuery.data.data).flat();
      const existingEmailIds = new Set(workflowStates.map((state) => state.email_id));

      emailsData.data.forEach((email) => {
        // Skip if already initialized or already has workflow state
        if (initializedEmailsRef.current.has(email.id) || existingEmailIds.has(email.id)) {
          return;
        }

        // Mark as initializing to prevent duplicate calls
        initializedEmailsRef.current.add(email.id);
        initializeEmailMutation.mutate(email.id, {
          onError: () => {
            // Remove from set on error so we can retry
            initializedEmailsRef.current.delete(email.id);
          },
        });
      });
    }
    // Only depend on emailsData and viewMode, not workflowStatesQuery.data to avoid loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailsData?.data, viewMode]);

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
    modifyEmailMutation.mutate(
      { emailId, actions },
      {
        onSuccess: () => {
          if (actions.delete) {
            setStatusDialog({
              open: true,
              title: "Email deleted",
              description: "The email has been moved to the Gmail trash.",
            });
          }
        },
      }
    );
    if (actions.delete) {
      setSelectedEmailId(null);
    }
  };

  const handleReplyFromDetail = () => {
    if (!emailDetail) return;

    const subject = emailDetail.subject.startsWith("Re:")
      ? emailDetail.subject
      : `Re: ${emailDetail.subject}`;

    const originalBody = emailDetail.body_text || emailDetail.body_html || "";

    const body = `\n\nOn ${new Date(emailDetail.date).toLocaleString()}, ${
      emailDetail.from.email
    } wrote:\n${originalBody}`;

    setComposeInitialData({
      subject,
      body,
      to: [emailDetail.from.email],
    });
    handleReply(emailDetail.id);
  };

  const handleForwardFromDetail = () => {
    if (!emailDetail) return;

    const subject = emailDetail.subject.startsWith("Fwd:")
      ? emailDetail.subject
      : `Fwd: ${emailDetail.subject}`;

    const originalBody = emailDetail.body_text || emailDetail.body_html || "";

    const body =
      `\n\n---------- Forwarded message ----------\n` +
      `From: ${emailDetail.from.email}\n` +
      `Date: ${new Date(emailDetail.date).toLocaleString()}\n` +
      `Subject: ${emailDetail.subject}\n\n` +
      originalBody;

    setComposeInitialData({
      subject,
      body,
      to: [],
    });
    handleForward(emailDetail.id);
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

  // Search handlers with Smart mode logic and fallback
  const handleSearch = async (query: string, mode: SearchMode, actualMode?: SearchMode) => {
    console.log("handleSearch", mode);
    setSearchQuery(query);
    const effectiveMode = actualMode || mode;
    setActualSearchMode(effectiveMode);
    setIsSearching(true);

    // Execute search based on mode
    if (effectiveMode === "semantic") {
      semanticSearchQuery.refetch();
    } else {
      // Fuzzy search
      fuzzySearchQuery.refetch().then((result) => {
        // Smart mode fallback: if fuzzy returns empty, try semantic
        if (
          mode === "smart" &&
          result.data?.data &&
          result.data.data.length === 0 &&
          effectiveMode === "fuzzy"
        ) {
          setActualSearchMode("semantic");
          semanticSearchQuery.refetch();
        }
      });
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setActualSearchMode("smart");
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

      // Handle both relevance_score (fuzzy) and similarity_score (semantic)
      const emailWithScore = email as EmailListItem & {
        relevance_score?: number;
        similarity_score?: number;
      };
      const score =
        emailWithScore.relevance_score !== undefined
          ? emailWithScore.relevance_score
          : emailWithScore.similarity_score !== undefined
            ? emailWithScore.similarity_score * 100 // Convert 0-1 to 0-100
            : undefined;

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
        relevance_score: score,
      } as EmailCardData & { relevance_score?: number };
    });
  }, [searchQueryResult.data]);

  // Handle connection status and errors
  if (mailboxesQuery.isError) {
    const error = mailboxesQuery.error as {
      response?: { status?: number; data?: { message?: string } };
    };
    if (error?.response?.status === 400) {
      return (
        <AppLayout>
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-4">No Email Provider Connected</h2>
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
    // Show error state for mailboxes if there's an error
    if (error?.response?.status !== 400) {
      return (
        <AppLayout>
          <ErrorState
            title="Failed to load mailboxes"
            message={
              error?.response?.data?.message || "An error occurred while loading your mailboxes."
            }
            onRetry={() => mailboxesQuery.refetch()}
            className="h-screen"
          />
        </AppLayout>
      );
    }
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header with Search Bar and View Mode Toggle */}
        <div className="flex flex-col gap-3 px-6 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">AI Email Flow</h1>
            <div className="flex flex-row gap-2 items-center">
              <Button onClick={handleCompose} variant="default">
                Compose
              </Button>
              <ViewModeToggle mode={viewMode} onModeChange={handleViewModeChange} />
            </div>
          </div>
          <HybridSearchBar
            onSearch={handleSearch}
            onClear={handleClearSearch}
            placeholder="Search emails..."
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
                searchMode={actualSearchMode}
              />
            </div>
          ) : viewMode === "kanban" ? (
            <KanbanBoard
              emailsByColumn={emailsByColumn}
              onEmailMove={handleEmailMove}
              onEmailClick={handleEmailClick}
              onSnoozeClick={handleSnoozeClick}
              onUnsnoozeClick={handleUnsnooze}
              filters={{
                unreadOnly: emailFilters.unread_only || 0,
                hasAttachments: emailFilters.has_attachments || 0,
              }}
              onFiltersChange={(filters) => {
                setEmailFilters({
                  unread_only: filters.unreadOnly || 0,
                  has_attachments: filters.hasAttachments || 0,
                });
              }}
            />
          ) : (
            <div className="flex w-full h-full relative">
              {/* Traditional List View */}
              <div
                className={cn(
                  mobileView === "mailboxes" ? "flex" : "hidden",
                  "md:flex flex-col w-full md:w-64 border-r border-gray-200"
                )}
              >
                <MailboxList
                  mailboxes={mailboxes}
                  selectedMailboxId={effectiveMailboxId}
                  onSelectMailbox={(id) => {
                    setSelectedMailboxId(id);
                    setSelectedEmailId(null);
                    setEmailPage(1); // Reset to first page when changing mailbox
                    navigateToEmails();
                  }}
                  loading={mailboxesLoading}
                />
              </div>

              <div
                className={cn(
                  mobileView === "emails" ? "flex" : "hidden",
                  "md:flex flex-col w-full md:max-w-96 md:w-[30%] border-r border-gray-200"
                )}
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
                  pagination={emailsData?.pagination}
                  onPageChange={setEmailPage}
                  onToggleRead={(id, read) => handleModifyEmail(id, { read })}
                />
              </div>

              <div
                className={cn(
                  mobileView === "detail" && selectedEmailId ? "flex" : "hidden",
                  "lg:flex flex-col w-fit md:min-w-100"
                )}
              >
                <EmailDetail
                  email={emailDetail || null}
                  loading={emailDetailLoading}
                  error={emailDetailLoading ? null : (emailDetailError as Error | null)}
                  onModify={handleModifyEmail}
                  onBack={navigateToEmails}
                  showBackButton={true}
                  onReply={handleReplyFromDetail}
                  onForward={handleForwardFromDetail}
                  onMarkUnread={(id) => handleModifyEmail(id, { read: false })}
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

        {/* Compose Modal */}
        <EmailCompose
          open={composeMode !== null}
          onClose={() => {
            handleCloseCompose();
            setComposeInitialData(null);
          }}
          mode={composeMode || "compose"}
          replyToEmailId={composeMode === "reply" ? replyToEmailId || undefined : undefined}
          forwardEmailId={composeMode === "forward" ? forwardEmailId || undefined : undefined}
          initialSubject={composeInitialData?.subject}
          initialBody={composeInitialData?.body}
          initialTo={composeInitialData?.to || []}
          onSent={(m) => {
            queryClient.invalidateQueries({ queryKey: ["emails"] });
            setStatusDialog({
              open: true,
              title:
                m === "reply" ? "Reply sent" : m === "forward" ? "Email forwarded" : "Email sent",
              description: "Your message has been delivered via Gmail.",
            });
          }}
        />

        <StatusDialog
          open={statusDialog.open}
          title={statusDialog.title}
          description={statusDialog.description}
          onClose={() => setStatusDialog((prev) => ({ ...prev, open: false }))}
        />
      </div>
    </AppLayout>
  );
}
