"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";

// Lớp phủ z-[60] nằm trên header (z-40) và thanh điều hướng mobile, phủ kín toàn màn hình
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/45 p-0 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full ${maxWidth} max-h-[92vh] flex flex-col bg-surface-card rounded-t-container sm:rounded-container shadow-xl border border-surface-border`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-surface-border">
          <h3 className="text-base font-bold text-pine-950">{title}</h3>
          <IconButton label="Đóng" onClick={onClose}>
            <X className="w-5 h-5" />
          </IconButton>
        </div>
        <div className="px-5 py-4 overflow-y-auto text-sm">{children}</div>
        {footer && <div className="px-5 py-3.5 border-t border-surface-border flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
  loading = false,
  danger = true,
  children,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
  danger?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Để sau
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-bark-700 leading-relaxed">
        <div>{message}</div>
        {children}
      </div>
    </Modal>
  );
}
