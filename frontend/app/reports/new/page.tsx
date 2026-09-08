"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ReportForm from "@/components/reports/ReportForm";

export default function NewReportPage() {
  return (
    <ProtectedRoute allowedRoles={["MEMBER"]}>
      <ReportForm mode="create" />
    </ProtectedRoute>
  );
}
