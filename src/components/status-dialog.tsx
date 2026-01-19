import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface StatusDialogProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  confirmLabel?: string;
}

export function StatusDialog({
  open,
  title,
  description,
  onClose,
  confirmLabel = "OK",
}: StatusDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {description && <p className="text-sm text-gray-600">{description}</p>}
        <DialogFooter>
          <Button onClick={onClose}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
