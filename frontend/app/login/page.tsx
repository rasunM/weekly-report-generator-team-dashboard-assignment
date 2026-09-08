"use client";

import { useRouter } from "next/navigation";
import AuthPageShell from "@/components/auth/AuthPageShell";
import LoginForm from "@/components/auth/LoginForm";
import { roleHomePath } from "@/lib/auth/roleHome";

export default function LoginPage() {
  const router = useRouter();

  return (
    <AuthPageShell title="Log in" subtitle="Sign in to Weekly Report Generator & Team Dashboard.">
      <LoginForm onSuccess={(user) => router.push(roleHomePath(user.role))} />
    </AuthPageShell>
  );
}
