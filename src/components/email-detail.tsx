import type { EmailDetail, Attachment } from "@/services/email";
import { emailService } from "@/services/email";
import { useState } from "react";
import { StatusDialog } from "@/components/status-dialog";
import { ErrorState } from "@/components/error-state";
import { ExternalLink, Reply, Forward, MailMinus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface EmailDetailProps {
  email: EmailDetail | null;
  loading?: boolean;
  error?: Error | null;
  onModify?: (
    emailId: string,
    actions: { read?: boolean; starred?: boolean; delete?: boolean }
  ) => void;
  onBack?: () => void;
  showBackButton?: boolean;
  onReply?: (emailId: string) => void;
  onForward?: (emailId: string) => void;
  onMarkUnread?: (emailId: string) => void;
}

export function EmailDetail({
  email,
  loading,
  error,
  onModify,
  onBack,
  showBackButton,
  onReply,
  onForward,
  onMarkUnread,
}: EmailDetailProps) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleOpenInGmail = () => {
    if (!email) return;
    const url = `https://mail.google.com/mail/u/0/#all/${email.id}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="flex-1 bg-white p-6">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 animate-pulse rounded w-3/4" />
          <div className="h-4 bg-gray-200 animate-pulse rounded w-1/2" />
          <div className="h-32 bg-gray-200 animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 bg-white p-8">
        <ErrorState
          title="Failed to load email"
          message={error.message || "An error occurred while loading this email."}
          className="py-12"
        />
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex-1 bg-white p-8 flex items-center justify-center">
        <p className="text-gray-500 hidden lg:block">Select an email to view</p>
      </div>
    );
  }

  const handleDownload = async (attachment: Attachment) => {
    setDownloading(attachment.id);
    setDownloadError(null);
    try {
      await emailService.downloadAttachment(email.id, attachment.id, attachment.filename);
    } catch (error) {
      console.error("Failed to download attachment:", error);
      const errorMsg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to download attachment";
      setDownloadError(errorMsg);
    } finally {
      setDownloading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString([], {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex-1 bg-white overflow-y-auto relative">
      <div className="p-4 md:p-6">
        {/* Back button for mobile */}
        {showBackButton && onBack && (
          <button
            onClick={onBack}
            className="md:hidden mb-4 p-2 text-gray-600 hover:text-gray-900 -ml-2"
            aria-label="Back to emails"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        )}

        {/* Header */}
        <div className="border-b border-gray-200 pb-4 mb-4">
          <div className="flex items-start justify-between mb-2 gap-2">
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900 flex-1 break-words">
              {email.subject || "(No Subject)"}
            </h1>
            <div className="flex gap-2">
              {/* Open in Gmail */}
              <button
                onClick={handleOpenInGmail}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                title="Open in Gmail"
                aria-label="Open in Gmail"
              >
                <ExternalLink className="w-5 h-5" />
              </button>
              {/* Reply */}
              {onReply && (
                <button
                  onClick={() => onReply(email.id)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                  title="Reply"
                  aria-label="Reply to email"
                >
                  <Reply className="w-5 h-5" />
                </button>
              )}
              {/* Forward */}
              {onForward && (
                <button
                  onClick={() => onForward(email.id)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                  title="Forward"
                  aria-label="Forward email"
                >
                  <Forward className="w-5 h-5" />
                </button>
              )}
              {/* Mark as unread */}
              {(onMarkUnread || onModify) && (
                <button
                  onClick={() =>
                    onMarkUnread ? onMarkUnread(email.id) : onModify?.(email.id, { read: false })
                  }
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                  title="Mark as unread"
                  aria-label="Mark email as unread"
                >
                  <MailMinus className="w-5 h-5" />
                </button>
              )}
              {/* Delete */}
              {onModify && (
                <button
                  onClick={() => setDeleteDialogOpen(true)}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                  title="Delete"
                  aria-label="Delete email"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
          <div className="space-y-1 text-sm text-gray-600">
            <div>
              <span className="font-medium">From:</span> {email.from.name || email.from.email}
              {email.from.name && (
                <span className="text-gray-500"> &lt;{email.from.email}&gt;</span>
              )}
            </div>
            {email.to.length > 0 && (
              <div>
                <span className="font-medium">To:</span>{" "}
                {email.to.map((addr) => addr.email).join(", ")}
              </div>
            )}
            {email.cc.length > 0 && (
              <div>
                <span className="font-medium">Cc:</span>{" "}
                {email.cc.map((addr) => addr.email).join(", ")}
              </div>
            )}
            <div>
              <span className="font-medium">Date:</span> {formatDate(email.date)}
            </div>
          </div>
        </div>

        {/* Attachments */}
        {email.attachments.length > 0 && (
          <div className="mb-4 pb-4 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Attachments</h3>
            <div className="space-y-2">
              {email.attachments.map((attachment) => (
                <button
                  key={attachment.id}
                  onClick={() => handleDownload(attachment)}
                  disabled={downloading === attachment.id}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                  <span className="flex-1 text-left">{attachment.filename}</span>
                  <span className="text-xs text-gray-500">
                    {(attachment.size / 1024).toFixed(1)} KB
                  </span>
                  {downloading === attachment.id && (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="prose max-w-none break-words">
          {email.body_html ? (
            <div
              dangerouslySetInnerHTML={{ __html: email.body_html }}
              className="email-body max-w-full overflow-x-auto"
              style={{
                maxWidth: "100%",
                wordWrap: "break-word",
              }}
            />
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-gray-900">
              {email.body_text || "(No content)"}
            </pre>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete email?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            This will move the email to the Gmail trash. You can restore it from Gmail if needed.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onModify?.(email.id, { delete: true });
                setDeleteDialogOpen(false);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Download Error Dialog */}
      {downloadError && (
        <StatusDialog
          open={true}
          title="Download failed"
          description={downloadError}
          onClose={() => setDownloadError(null)}
        />
      )}
    </div>
  );
}
