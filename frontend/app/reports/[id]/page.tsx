"use client";

import { use } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ReportDetail from "@/components/reports/ReportDetail";

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <ProtectedRoute allowedRoles={["MEMBER", "MANAGER"]}>
      <ReportDetail reportId={id} />
    </ProtectedRoute>
  );
}
