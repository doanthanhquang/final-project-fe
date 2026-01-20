import type { Attachment } from "@/services/email";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AttachmentPreviewDialogProps {
  open: boolean;
  attachment: Attachment | null;
  url: string | null;
  mime: string | null;
  onClose: () => void;
}

export function AttachmentPreviewDialog({
  open,
  attachment,
  url,
  mime,
  onClose,
}: AttachmentPreviewDialogProps) {
  const renderContent = () => {
    if (!url) return null;

    if (mime?.startsWith("image/")) {
      return <img src={url} alt={attachment?.filename} className="w-full h-full object-contain" />;
    }

    if (mime === "application/pdf") {
      return <iframe src={url} className="w-full h-[70vh]" title="PDF preview" />;
    }

    if (mime?.startsWith("text/") || mime === "application/json") {
      return <iframe src={url} className="w-full h-[70vh]" title="Text preview" />;
    }

    return <iframe src={url} className="w-full h-[70vh]" title="File preview" />;
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : null)}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{attachment?.filename || "Attachment preview"}</DialogTitle>
        </DialogHeader>
        <div className="mt-2 min-h-[400px] max-h-[70vh] overflow-hidden rounded-md border border-gray-200">
          {renderContent()}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
