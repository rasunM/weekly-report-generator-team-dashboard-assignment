"use client";

import { use } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ReportForm from "@/components/reports/ReportForm";

export default function EditReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <ProtectedRoute allowedRoles={["MEMBER"]}>
      <ReportForm mode="edit" reportId={id} />
    </ProtectedRoute>
  );
}
