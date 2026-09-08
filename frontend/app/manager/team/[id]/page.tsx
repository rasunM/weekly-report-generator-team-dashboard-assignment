"use client";

import { use } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import TeamMemberProfile from "@/components/manager/TeamMemberProfile";

export default function TeamMemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <ProtectedRoute allowedRoles={["MANAGER"]}>
      <TeamMemberProfile userId={id} />
    </ProtectedRoute>
  );
}
