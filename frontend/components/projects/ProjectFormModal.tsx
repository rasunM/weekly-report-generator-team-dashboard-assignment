"use client";

// Add/Edit modal for a project (Feature 11). One component handles both modes: `project` present
// means Edit (pre-filled, PATCH), absent means Add (POST). Validation mirrors the backend's actual
// dto exactly - name required 1-120 chars, description optional up to 1000 - so the manager sees
// the same limits the server will enforce, without inventing stricter or looser rules.
import { useState } from "react";
import type { ProjectSummary } from "@/types/project";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Textarea from "@/components/common/Textarea";
import ErrorMessage from "@/components/common/ErrorMessage";

const NAME_MAX = 120;
const DESCRIPTION_MAX = 1000;

export default function ProjectFormModal({
  project,
  onCancel,
  onSubmit,
}: {
  project?: ProjectSummary;
  onCancel: () => void;
  onSubmit: (input: { name: string; description?: string; isActive: boolean }) => Promise<void>;
}) {
  const isEdit = !!project;
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [isActive, setIsActive] = useState(project?.isActive ?? true);
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError("Name is required.");
      return;
    }
    if (trimmedName.length > NAME_MAX) {
      setNameError(`Name must be ${NAME_MAX} characters or fewer.`);
      return;
    }
    setNameError(null);
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        name: trimmedName,
        description: description.trim() ? description.trim() : undefined,
        isActive,
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not save this project.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      title={isEdit ? "Edit Project" : "Add Project"}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isSubmitting}>
            {isEdit ? "Save Changes" : "Add Project"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (nameError) setNameError(null);
          }}
          error={nameError ?? undefined}
          maxLength={NAME_MAX}
          disabled={isSubmitting}
          autoFocus
        />
        <Textarea
          label="Description (optional)"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={DESCRIPTION_MAX}
          disabled={isSubmitting}
        />
        {isEdit && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={isSubmitting}
              className="h-4 w-4 rounded border-slate-300"
            />
            Active
          </label>
        )}
      </div>

      {submitError && (
        <div className="mt-3">
          <ErrorMessage message={submitError} />
        </div>
      )}
    </Modal>
  );
}
