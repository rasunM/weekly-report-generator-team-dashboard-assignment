"use client";

import { use } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ManagerReviewDetail from "@/components/manager/ManagerReviewDetail";

export default function ManagerReportReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <ProtectedRoute allowedRoles={["MANAGER"]}>
      <ManagerReviewDetail reportId={id} />
    </ProtectedRoute>
  );
}
