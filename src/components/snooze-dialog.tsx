import { useState } from "react";
import { Clock, X, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format, addHours, addDays, nextSaturday, nextMonday } from "date-fns";

interface SnoozeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSnooze: (snoozeUntil?: string, quickOption?: string) => void;
  emailSubject: string;
}

type QuickOption = "later_today" | "tomorrow" | "this_weekend" | "next_week";

export function SnoozeDialog({ isOpen, onClose, onSnooze, emailSubject }: SnoozeDialogProps) {
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("");

  const quickOptions: Array<{
    id: QuickOption;
    label: string;
    description: string;
    icon: string;
  }> = [
    {
      id: "later_today",
      label: "Later Today",
      description: format(addHours(new Date(), 4), "h:mm a"),
      icon: "☀️",
    },
    {
      id: "tomorrow",
      label: "Tomorrow",
      description: format(addDays(new Date(), 1), "EEE, h:mm a"),
      icon: "📅",
    },
    {
      id: "this_weekend",
      label: "This Weekend",
      description: format(nextSaturday(new Date()), "EEE, MMM d"),
      icon: "🏖️",
    },
    {
      id: "next_week",
      label: "Next Week",
      description: format(nextMonday(new Date()), "EEE, MMM d"),
      icon: "📆",
    },
  ];

  const handleQuickSnooze = (option: QuickOption) => {
    onSnooze(undefined, option);
    handleClose();
  };

  const handleCustomSnooze = () => {
    if (!customDate || !customTime) {
      alert("Please select both date and time");
      return;
    }

    const snoozeUntil = `${customDate}T${customTime}:00`;
    onSnooze(snoozeUntil, undefined);
    handleClose();
  };

  const handleClose = () => {
    setCustomDate("");
    setCustomTime("");
    onClose();
  };

  const getMinTime = () => {
    if (customDate === format(new Date(), "yyyy-MM-dd")) {
      return format(new Date(), "HH:mm");
    }
    return "00:00";
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              Snooze Email
            </DialogTitle>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <DialogDescription className="text-sm text-gray-600 truncate">
            {emailSubject}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Quick Options */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Quick Options</p>
            <div className="grid grid-cols-2 gap-2">
              {quickOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleQuickSnooze(option.id)}
                  className="flex items-start gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-400 transition-colors text-left"
                >
                  <span className="text-xl">{option.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{option.label}</p>
                    <p className="text-xs text-gray-500">{option.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date and Time */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Custom Time</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  min={format(new Date(), "yyyy-MM-dd")}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  min={getMinTime()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <Button
              onClick={handleCustomSnooze}
              disabled={!customDate || !customTime}
              className="w-full"
              variant="outline"
            >
              Set Custom Snooze
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
