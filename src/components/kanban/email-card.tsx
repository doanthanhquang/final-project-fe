import { formatDistanceToNow, format, parseISO } from "date-fns";
import { Paperclip, Clock, X } from "lucide-react";
import type { EmailCardData } from "@/types/kanban";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface EmailCardProps {
  email: EmailCardData;
  onClick?: () => void;
  onSnoozeClick?: (e: React.MouseEvent) => void;
  onUnsnoozeClick?: (e: React.MouseEvent) => void;
}

export function EmailCard({ email, onClick, onSnoozeClick, onUnsnoozeClick }: EmailCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: email.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const timeAgo = email.date
    ? formatDistanceToNow(new Date(email.date), { addSuffix: false })
    : "";

  const isSnoozed = !!email.workflowState?.snoozed_until;
  const snoozeUntilDate = email.workflowState?.snoozed_until
    ? parseISO(email.workflowState.snoozed_until)
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`bg-white rounded-lg border border-gray-200 p-4 mb-3 cursor-move hover:shadow-md transition-shadow ${
        !email.read ? "border-l-4 border-l-blue-500" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-medium text-gray-600">
              {email.sender.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm truncate ${!email.read ? "font-semibold" : "font-medium"}`}>
              {email.sender.name}
            </p>
            <p className="text-xs text-gray-500">{timeAgo}</p>
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
            <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
          </svg>
        </button>
      </div>

      {/* Subject */}
      <h3 className={`text-sm mb-2 ${!email.read ? "font-semibold" : "font-medium"}`}>
        {email.subject}
      </h3>

      {/* AI Summary */}
      {email.summary && (
        <div className="bg-gray-50 border border-gray-200 rounded p-2 mb-2">
          <div className="flex items-start gap-1 mb-1">
            <svg
              className="w-3 h-3 text-purple-600 mt-0.5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z" />
            </svg>
            <span className="text-xs font-medium text-purple-600">AI Summary</span>
          </div>
          <p className="text-xs text-gray-600 line-clamp-4">{email.summary}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          {email.hasAttachments && (
            <div className="flex items-center gap-1 text-gray-500">
              <Paperclip className="w-3 h-3" />
            </div>
          )}
          {isSnoozed && snoozeUntilDate && (
            <div className="flex items-center gap-1 text-orange-500">
              <Clock className="w-3 h-3" />
              <span className="text-xs">
                Until {format(snoozeUntilDate, "MMM d, h:mm a")}
              </span>
            </div>
          )}
        </div>
        <button className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
          Open Mail
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </button>
      </div>

      {/* Snooze/Unsnooze button */}
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
        {isSnoozed ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUnsnoozeClick?.(e);
            }}
            className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-800 font-medium"
          >
            <X className="w-3 h-3" />
            End Snooze
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSnoozeClick?.(e);
            }}
            className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800"
          >
            <Clock className="w-3 h-3" />
            Snooze
          </button>
        )}
      </div>
    </div>
  );
}
