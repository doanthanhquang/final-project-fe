import { type Mailbox } from '@/services/email';
import { cn } from '@/lib/utils';

interface MailboxListProps {
  mailboxes: Mailbox[];
  selectedMailboxId: string | null;
  onSelectMailbox: (mailboxId: string) => void;
  loading?: boolean;
  onClose?: () => void;
}

export function MailboxList({ mailboxes, selectedMailboxId, onSelectMailbox, loading, onClose }: MailboxListProps) {
  if (loading) {
    return (
      <div className="w-full md:w-64 h-full border-r border-gray-200 bg-white p-4">
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 bg-gray-200 animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full md:w-64 h-full border-r border-gray-200 bg-white overflow-y-auto">
      <div className="p-4">
        {/* Mobile close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden absolute top-4 right-4 p-2 text-gray-600 hover:text-gray-900"
            aria-label="Close mailboxes"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <h2 className="text-lg font-semibold mb-4">Mailboxes</h2>
        <nav className="space-y-1">
          {mailboxes.map((mailbox) => (
            <button
              key={mailbox.id}
              onClick={() => onSelectMailbox(mailbox.id)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors',
                'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500',
                selectedMailboxId === mailbox.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700'
              )}
              aria-current={selectedMailboxId === mailbox.id ? 'page' : undefined}
            >
              <div className="flex items-center justify-between">
                <span>{mailbox.name}</span>
                {mailbox.unread_count > 0 && (
                  <span className="bg-blue-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                    {mailbox.unread_count}
                  </span>
                )}
              </div>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
