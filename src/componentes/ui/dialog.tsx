"use client";

import * as React from "react";
import { Dialog as DialogoPrimitivo } from "radix-ui";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";

function Dialog({ ...props }: React.ComponentProps<typeof DialogoPrimitivo.Root>) {
  return <DialogoPrimitivo.Root data-slot="dialog" {...props} />;
}

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogoPrimitivo.Content>) {
  return (
    <DialogoPrimitivo.Portal>
      <DialogoPrimitivo.Overlay
        data-slot="dialog-overlay"
        className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
      />
      <DialogoPrimitivo.Content
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid max-h-[min(90dvh,44rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-2xl border bg-popover p-6 text-popover-foreground shadow-lg data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className,
        )}
        {...props}
      >
        {children}
        <DialogoPrimitivo.Close data-slot="dialog-close" asChild>
          <Button variant="ghost" size="icon-sm" className="absolute top-3 right-3">
            <XIcon />
            <span className="sr-only">Cerrar</span>
          </Button>
        </DialogoPrimitivo.Close>
      </DialogoPrimitivo.Content>
    </DialogoPrimitivo.Portal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={cn("flex flex-col gap-1 pr-8", className)} {...props} />;
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogoPrimitivo.Title>) {
  return <DialogoPrimitivo.Title data-slot="dialog-title" className={cn("text-lg font-semibold", className)} {...props} />;
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogoPrimitivo.Description>) {
  return (
    <DialogoPrimitivo.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle };
