"use client";

// Shared modal chrome (backdrop, card, title/description, Escape-to-close, scroll lock) used by
// every dialog in the app - Request Changes, Add/Edit Project, Delete Project, Add Team Member,
// Remove Team Member. Each caller still owns its own body content and footer buttons/behavior;
// this component only standardizes the wrapper so every modal in the app looks and behaves the
// same way instead of five slightly-different copies of the same markup.
import { useEffect } from "react";
import type { ReactNode } from "react";

export default function Modal({
  title,
  description,
  onClose,
  children,
  footer,
  maxWidthClassName = "max-w-md",
}: {
  title: string;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  maxWidthClassName?: string;
}) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${maxWidthClassName} max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl`}
      >
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        <div className="mt-4">{children}</div>
        <div className="mt-6 flex flex-col-reverse justify-end gap-2 sm:flex-row sm:gap-3">{footer}</div>
      </div>
    </div>
  );
}
