"use client";

import { memo, useCallback } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
  onCancel?: () => void;
  /**
   * When true the confirm button shows a spinner and is disabled,
   * the cancel button is disabled, and the dialog cannot be dismissed
   * via Escape or backdrop click until the operation completes.
   */
  isPending?: boolean;
}

export const ConfirmDialog = memo(function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "destructive",
  onConfirm,
  onCancel,
  isPending = false,
}: ConfirmDialogProps) {
  const handleCancel = useCallback(() => {
    if (isPending) return;
    onCancel?.();
    onOpenChange(false);
  }, [isPending, onCancel, onOpenChange]);

  const handleConfirm = useCallback(() => {
    if (isPending) return;
    onConfirm();
    onOpenChange(false);
  }, [isPending, onConfirm, onOpenChange]);

  // Block Escape / backdrop-click from closing the dialog while pending
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (isPending && !next) return;
      onOpenChange(next);
    },
    [isPending, onOpenChange],
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        {/* Backdrop overlay — mirrors SheetOverlay animation pattern */}
        <DialogPrimitive.Backdrop
          className={cn(
            "fixed inset-0 z-50 bg-black/10 duration-100",
            "data-ending-style:opacity-0 data-starting-style:opacity-0",
            "supports-backdrop-filter:backdrop-blur-xs",
            "data-open:animate-in data-open:fade-in-0",
            "data-closed:animate-out data-closed:fade-out-0",
          )}
        />

        {/* Full-screen flex container centers the dialog panel */}
        <DialogPrimitive.Popup
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center p-4",
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
            "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            "duration-150",
          )}
        >
          {/* Dialog panel */}
          <div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-lg">
            <DialogPrimitive.Title className="text-base font-semibold text-foreground">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">
              {description}
            </DialogPrimitive.Description>

            <div className="mt-6 flex justify-end gap-2">
              {/* Close primitive wires the cancel button into the dialog close mechanism */}
              <DialogPrimitive.Close
                render={
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isPending}
                  />
                }
              >
                {cancelLabel}
              </DialogPrimitive.Close>

              <Button
                variant={variant === "destructive" ? "destructive" : "default"}
                onClick={handleConfirm}
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  confirmLabel
                )}
              </Button>
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
});
