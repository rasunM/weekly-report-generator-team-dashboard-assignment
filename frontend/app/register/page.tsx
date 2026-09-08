"use client";

import { useRouter } from "next/navigation";
import AuthPageShell from "@/components/auth/AuthPageShell";
import RegisterForm from "@/components/auth/RegisterForm";
import { roleHomePath } from "@/lib/auth/roleHome";

export default function RegisterPage() {
  const router = useRouter();

  return (
    <AuthPageShell title="Create an account" subtitle="Register to get started.">
      <RegisterForm onSuccess={(user) => router.push(roleHomePath(user.role))} />
    </AuthPageShell>
  );
}
