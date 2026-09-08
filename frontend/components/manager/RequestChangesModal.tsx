"use client";

// Modal for the "Request Changes" manager action (Feature 9). The comment is required both here
// (inline validation, so the manager sees the problem immediately) and server-side (review.dto.ts
// `.min(1)`) - this only prevents an avoidable round trip, it isn't the real enforcement.
import { useState } from "react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import Textarea from "@/components/common/Textarea";
import ErrorMessage from "@/components/common/ErrorMessage";

export default function RequestChangesModal({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (comment: string) => Promise<void>;
}) {
  const [comment, setComment] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const trimmed = comment.trim();
    if (!trimmed) {
      setValidationError("A comment explaining what needs correction is required.");
      return;
    }
    setValidationError(null);
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(trimmed);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not submit this request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      title="Request Changes"
      description="Explain what the team member needs to correct. They'll see this comment on the report."
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isSubmitting}>
            Request Changes
          </Button>
        </>
      }
    >
      <Textarea
        label="General comment"
        rows={5}
        value={comment}
        onChange={(e) => {
          setComment(e.target.value);
          if (validationError) setValidationError(null);
        }}
        error={validationError ?? undefined}
        placeholder="e.g. Please add more detail to the blockers section and log hours for Friday."
        disabled={isSubmitting}
        autoFocus
      />
      {submitError && (
        <div className="mt-3">
          <ErrorMessage message={submitError} />
        </div>
      )}
    </Modal>
  );
}
