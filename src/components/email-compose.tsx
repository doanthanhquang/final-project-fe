import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { emailService, type SendEmailData } from "@/services/email";

interface EmailComposeProps {
  open: boolean;
  onClose: () => void;
  mode: "compose" | "reply" | "forward";
  replyToEmailId?: string;
  forwardEmailId?: string;
  initialSubject?: string;
  initialBody?: string;
  initialTo?: string[];
}

export function EmailCompose({
  open,
  onClose,
  mode,
  replyToEmailId,
  forwardEmailId,
  initialSubject = "",
  initialBody = "",
  initialTo = [],
}: EmailComposeProps) {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // Update form when initial values change (for reply/forward)
  useEffect(() => {
    if (open) {
      if (mode === "reply" || mode === "forward") {
        setSubject(initialSubject || "");
        setBody(initialBody || "");
        setTo(initialTo.join(", "));
      } else {
        setTo("");
        setSubject("");
        setBody("");
      }
    }
  }, [open, mode, initialSubject, initialBody, initialTo]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    setError(null);
    setSending(true);

    try {
      const toEmails = to
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean);
      const ccEmails = cc
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean);
      const bccEmails = bcc
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean);

      if (toEmails.length === 0) {
        setError("At least one recipient is required");
        setSending(false);
        return;
      }

      const emailData: SendEmailData = {
        to: toEmails,
        subject: subject || "(No Subject)",
        body: body || "",
        ...(ccEmails.length > 0 && { cc: ccEmails }),
        ...(bccEmails.length > 0 && { bcc: bccEmails }),
      };

      if (mode === "reply" && replyToEmailId) {
        await emailService.replyEmail(
          replyToEmailId,
          body,
          subject || undefined
        );
      } else if (mode === "forward" && forwardEmailId) {
        await emailService.forwardEmail(
          forwardEmailId,
          toEmails,
          body || undefined
        );
      } else {
        await emailService.sendEmail(emailData);
      }

      // Reset form
      setTo("");
      setCc("");
      setBcc("");
      setSubject("");
      setBody("");
      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to send email. Please try again."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "compose" && "Compose Email"}
            {mode === "reply" && "Reply"}
            {mode === "forward" && "Forward"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              disabled={sending}
            />
          </div>

          <div>
            <Label htmlFor="cc">Cc (optional)</Label>
            <Input
              id="cc"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="cc@example.com"
              disabled={sending}
            />
          </div>

          <div>
            <Label htmlFor="bcc">Bcc (optional)</Label>
            <Input
              id="bcc"
              value={bcc}
              onChange={(e) => setBcc(e.target.value)}
              placeholder="bcc@example.com"
              disabled={sending}
            />
          </div>

          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              disabled={sending}
            />
          </div>

          <div>
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your message here..."
              rows={10}
              disabled={sending}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
