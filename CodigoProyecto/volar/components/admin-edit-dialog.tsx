"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export function AdminEditDialog({
  title,
  returnTo,
  children,
}: {
  title: string;
  returnTo: string;
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) router.push(returnTo);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">Formulario de edición.</DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  );
}
