"use client";

// Delete confirmation for a project (Feature 11). The backend's DELETE doesn't always remove the
// row - if reports reference the project it soft-deletes (isActive: false) instead
// (projects.service.ts) - so the copy here sets that expectation up front rather than promising a
// permanent delete the backend might not actually perform.
import { useState } from "react";
import type { ProjectSummary } from "@/types/project";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import ErrorMessage from "@/components/common/ErrorMessage";

export default function DeleteProjectModal({
  project,
  onCancel,
  onConfirm,
}: {
  project: ProjectSummary;
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
      setError(err instanceof Error ? err.message : "Could not delete this project.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Modal
      title={`Delete "${project.name}"?`}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm} isLoading={isDeleting}>
            Delete
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">
        {project.reportCount > 0
          ? `This project has ${project.reportCount} report${project.reportCount === 1 ? "" : "s"} attached to it, so it can't be permanently removed - it will be deactivated instead and hidden from new reports.`
          : "This project has no reports attached, so it will be permanently removed."}
      </p>

      {error && (
        <div className="mt-3">
          <ErrorMessage message={error} />
        </div>
      )}
    </Modal>
  );
}
