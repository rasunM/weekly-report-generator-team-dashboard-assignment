"use client";

// Invite/add-user modal (Feature 12). NOTE: POST /api/users is not a real invite-email flow - the
// manager sets a temporary password directly and the account is created immediately as active
// (users.dto.ts comment, confirmed in backend research) - so this modal collects a temp password
// rather than sending an email invitation the backend doesn't actually support.
import { useState } from "react";
import type { Role } from "@/types/auth";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import ErrorMessage from "@/components/common/ErrorMessage";

const NAME_MAX = 120;
const PASSWORD_MIN = 8;

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "MEMBER", label: "Team Member" },
  { value: "MANAGER", label: "Manager" },
];

export default function InviteUserModal({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (input: { name: string; email: string; role: Role; temporaryPassword: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("MEMBER");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; temporaryPassword?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate() {
    const errors: typeof fieldErrors = {};
    if (!name.trim()) errors.name = "Name is required.";
    else if (name.trim().length > NAME_MAX) errors.name = `Name must be ${NAME_MAX} characters or fewer.`;
    if (!email.trim()) errors.email = "Email is required.";
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = "Enter a valid email address.";
    if (!temporaryPassword) errors.temporaryPassword = "A temporary password is required.";
    else if (temporaryPassword.length < PASSWORD_MIN) errors.temporaryPassword = `Password must be at least ${PASSWORD_MIN} characters.`;
    return errors;
  }

  async function handleSubmit() {
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), email: email.trim(), role, temporaryPassword });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not add this user.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      title="Add Team Member"
      description="This creates the account immediately with the password below - no invite email is sent, so share it with them directly."
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isSubmitting}>
            Add Team Member
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors.name}
          disabled={isSubmitting}
          autoFocus
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
          disabled={isSubmitting}
        />
        <Select
          label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          options={ROLE_OPTIONS}
          disabled={isSubmitting}
        />
        <Input
          label="Temporary password"
          type="text"
          value={temporaryPassword}
          onChange={(e) => setTemporaryPassword(e.target.value)}
          error={fieldErrors.temporaryPassword}
          disabled={isSubmitting}
          placeholder="At least 8 characters"
        />
      </div>

      {submitError && (
        <div className="mt-3">
          <ErrorMessage message={submitError} />
        </div>
      )}
    </Modal>
  );
}
