"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { ApiError } from "@/lib/api/client";
import { isValidEmail } from "@/lib/validation";
import Input from "@/components/common/Input";
import Button from "@/components/common/Button";
import ErrorMessage from "@/components/common/ErrorMessage";
import type { User } from "@/types/auth";

interface FieldErrors {
  email?: string;
  password?: string;
}

export default function LoginForm({ onSuccess }: { onSuccess: (user: User) => void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!email.trim()) errors.email = "Email is required";
    else if (!isValidEmail(email)) errors.email = "Enter a valid email address";
    if (!password) errors.password = "Password is required";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      onSuccess(user);
    } catch (err) {
      if (err instanceof ApiError) {
        // 401 -> invalid credentials (backend deliberately doesn't say which field is wrong -
        // auth.service.ts login()); 400 -> validation failed; anything else -> generic/network.
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
        label="Email"
        type="email"
        name="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldErrors.email}
      />
      <Input
        label="Password"
        type="password"
        name="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldErrors.password}
      />
      <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
        {isSubmitting ? "Logging in..." : "Log in"}
      </Button>
      <p className="text-center text-sm text-slate-500">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-slate-900 hover:underline">
          Register
        </Link>
      </p>
    </form>
  );
}
