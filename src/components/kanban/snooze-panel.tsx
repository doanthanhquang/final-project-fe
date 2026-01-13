import { useEffect } from "react";
import { X } from "lucide-react";
import { EmailCard } from "./email-card";
import type { EmailCardData } from "@/types/kanban";
import { cn } from "@/lib/utils";

interface SnoozePanelProps {
  isOpen: boolean;
  onClose: () => void;
  emails: EmailCardData[];
  onEmailClick?: (emailId: string) => void;
  onUnsnoozeClick?: (emailId: string) => void;
}

export function SnoozePanel({
  isOpen,
  onClose,
  emails,
  onEmailClick,
  onUnsnoozeClick,
}: SnoozePanelProps) {
  // Close panel on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 transition-opacity z-40",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 h-full w-96 bg-white shadow-2xl transition-transform duration-300 ease-in-out z-50 flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-purple-50">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⏰</span>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Snoozed Emails</h2>
              <p className="text-sm text-gray-600">{emails.length} email(s)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-purple-100 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
            aria-label="Close panel"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <span className="text-6xl mb-4">⏰</span>
              <p className="text-lg font-medium">No snoozed emails</p>
              <p className="text-sm text-gray-400 mt-2">Snoozed emails will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {emails.map((email) => (
                <EmailCard
                  key={email.id}
                  email={email}
                  onClick={onEmailClick ? () => onEmailClick(email.id) : undefined}
                  onUnsnoozeClick={onUnsnoozeClick ? () => onUnsnoozeClick(email.id) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
