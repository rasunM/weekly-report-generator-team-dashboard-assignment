"use client";

// Remove-user confirmation (Feature 12). DELETE /api/users/:userId is a REAL hard delete - the
// User model has no isActive/isDeleted field, and it cascades to the user's reports (and their
// versions/hours entries) plus refresh tokens (schema.prisma onDelete: Cascade). The copy here
// reflects that honestly rather than calling it "deactivate."
import { useState } from "react";
import type { User } from "@/types/auth";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import ErrorMessage from "@/components/common/ErrorMessage";

export default function RemoveUserModal({
  user,
  onCancel,
  onConfirm,
}: {
  user: User;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    setIsDeleting(true);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove this user.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Modal
      title={`Remove ${user.name}?`}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm} isLoading={isDeleting}>
            Permanently Delete
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">
        This permanently deletes their account, along with all of their weekly reports and report
        history. This cannot be undone.
      </p>

      {error && (
        <div className="mt-3">
          <ErrorMessage message={error} />
        </div>
      )}
    </Modal>
  );
}
