import { type EmailListItem } from "@/services/email";
import { cn } from "@/lib/utils";

interface EmailListProps {
  emails: EmailListItem[];
  selectedEmailId: string | null;
  onSelectEmail: (emailId: string) => void;
  loading?: boolean;
  onBack?: () => void;
  showBackButton?: boolean;
}

export function EmailList({
  emails,
  selectedEmailId,
  onSelectEmail,
  loading,
  onBack,
  showBackButton,
}: EmailListProps) {
  if (loading) {
    return (
      <div className="flex-1 border-r border-gray-200 bg-white p-4">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-gray-200 animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex-1 border-r border-gray-200 bg-white p-8 flex flex-col items-center justify-center">
        {showBackButton && onBack && (
          <button
            onClick={onBack}
            className="md:hidden absolute top-4 left-4 p-2 text-gray-600 hover:text-gray-900"
            aria-label="Back to mailboxes"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        )}
        <p className="text-gray-500">No emails in this mailbox</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  return (
    <div className="flex-1 border-r border-gray-200 bg-white overflow-y-auto relative">
      {/* Back button for mobile */}
      {showBackButton && onBack && (
        <div className="md:hidden sticky top-0 z-10 bg-white border-b border-gray-200 p-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-gray-600 hover:text-gray-900 -ml-2"
            aria-label="Back to mailboxes"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h2 className="text-lg font-semibold">Emails</h2>
        </div>
      )}

      <div className="divide-y divide-gray-200">
        {emails.map((email) => (
          <button
            key={email.id}
            onClick={() => onSelectEmail(email.id)}
            className={cn(
              "w-full text-left p-4 hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors",
              "focus:ring-2 focus:ring-blue-500 focus:ring-inset",
              !email.read && "bg-blue-50",
              selectedEmailId === email.id && "bg-gray-100 lg:bg-blue-50"
            )}
            aria-current={selectedEmailId === email.id ? "true" : undefined}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      "text-sm font-medium truncate",
                      !email.read && "font-semibold"
                    )}
                  >
                    {email.from}
                  </span>
                  {email.has_attachments && (
                    <svg
                      className="w-4 h-4 text-gray-400 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                      />
                    </svg>
                  )}
                </div>
                <p
                  className={cn(
                    "text-sm text-gray-900 truncate mb-1",
                    !email.read && "font-semibold"
                  )}
                >
                  {email.subject || "(No Subject)"}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDate(email.date)}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
