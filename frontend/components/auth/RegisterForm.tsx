"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { ApiError } from "@/lib/api/client";
import { isValidEmail } from "@/lib/validation";
import type { Role, User } from "@/types/auth";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import Button from "@/components/common/Button";
import ErrorMessage from "@/components/common/ErrorMessage";

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

// Role is selectable at signup because the backend explicitly allows it (auth.dto.ts
// registerSchema: role is "MEMBER" | "MANAGER", defaulting to MEMBER) - this is not a frontend
// invention, see architecture-plan.md's "role assignment at signup" note carried into the backend.
const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "MEMBER", label: "Team Member" },
  { value: "MANAGER", label: "Manager" },
];

export default function RegisterForm({ onSuccess }: { onSuccess: (user: User) => void }) {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<Role>("MEMBER");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = "Name is required";
    else if (name.trim().length > 120) errors.name = "Name must be 120 characters or fewer";

    if (!email.trim()) errors.email = "Email is required";
    else if (!isValidEmail(email)) errors.email = "Enter a valid email address";

    // Mirrors auth.dto.ts registerSchema: password min 8 chars.
    if (!password) errors.password = "Password is required";
    else if (password.length < 8) errors.password = "Password must be at least 8 characters";

    if (confirmPassword !== password) errors.confirmPassword = "Passwords do not match";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const user = await register({ name: name.trim(), email: email.trim(), password, role });
      onSuccess(user);
    } catch (err) {
      if (err instanceof ApiError) {
        // 409 CONFLICT -> email already registered (auth.service.ts register()); 400 -> validation.
        setFormError(err.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <ErrorMessage message={formError} />
      <Input
        label="Full name"
        name="name"
        autoComplete="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={fieldErrors.name}
      />
      <Input
        label="Email"
        type="email"
        name="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldErrors.email}
      />
      <Select
        label="Role"
        name="role"
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
        options={ROLE_OPTIONS}
      />
      <Input
        label="Password"
        type="password"
        name="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldErrors.password}
      />
      <Input
        label="Confirm password"
        type="password"
        name="confirmPassword"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        error={fieldErrors.confirmPassword}
      />
      <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
        {isSubmitting ? "Creating account..." : "Create account"}
      </Button>
      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-slate-900 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
