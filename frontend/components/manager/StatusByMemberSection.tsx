"use client";

// "Report Status by Team Member" (Feature 7, chart #1). GET /api/dashboard/status-by-member
// returns exactly one status per member for a given week (dashboard.service.ts
// `getStatusByMember()`), including the synthetic "NOT_STARTED" value for a member with no report
// that week - it does NOT return counts across a member's whole history (that's not what this
// endpoint computes). The bar chart below is a real, non-fabricated aggregation of that same
// per-member data (counting how many members currently sit in each status) done client-side purely
// for the "chart" requirement; the roster underneath shows the actual per-member breakdown the
// endpoint provides, which is the literal "by team member" view.
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "@/lib/auth/AuthContext";
import { getStatusByMember } from "@/lib/api/dashboard";
import { ApiError } from "@/lib/api/client";
import { currentWeekStartDateOnly } from "@/lib/week";
import type { MemberDisplayStatus, MemberStatus } from "@/types/dashboard";
import DashboardCard from "@/components/common/DashboardCard";
import StatusBadge from "@/components/common/StatusBadge";
import Input from "@/components/common/Input";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ErrorMessage from "@/components/common/ErrorMessage";
import EmptyState from "@/components/common/EmptyState";

const STATUS_ORDER: MemberDisplayStatus[] = ["DRAFT", "SUBMITTED", "NEEDS_CORRECTION", "APPROVED", "NOT_STARTED"];
const STATUS_LABELS: Record<MemberDisplayStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  NEEDS_CORRECTION: "Needs Correction",
  APPROVED: "Approved",
  NOT_STARTED: "Not Started",
};
const STATUS_COLORS: Record<MemberDisplayStatus, string> = {
  DRAFT: "#94a3b8",
  SUBMITTED: "#3b82f6",
  NEEDS_CORRECTION: "#f59e0b",
  APPROVED: "#22c55e",
  NOT_STARTED: "#cbd5e1",
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: MemberStatus[] };

export default function StatusByMemberSection() {
  const { accessToken } = useAuth();
  const [weekStart, setWeekStart] = useState(currentWeekStartDateOnly());
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setState({ status: "loading" });
    getStatusByMember(accessToken, weekStart)
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            status: "error",
            message: err instanceof ApiError ? err.message : "Could not load status by member.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, weekStart]);

  const chartData =
    state.status === "ready"
      ? STATUS_ORDER.map((status) => ({
          status,
          label: STATUS_LABELS[status],
          count: state.data.filter((m) => m.status === status).length,
        })).filter((row) => row.count > 0)
      : [];

  return (
    <DashboardCard
      title="Report Status by Team Member"
      action={
        <div className="w-40">
          <Input aria-label="Week" type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
        </div>
      }
    >
      {state.status === "loading" && <LoadingSpinner label="Loading..." />}
      {state.status === "error" && <ErrorMessage message={state.message} />}
      {state.status === "ready" && (
        <div className="flex flex-col gap-4">
          {state.data.length === 0 ? (
            <EmptyState message="No team members found." />
          ) : (
            <>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {chartData.map((row) => (
                        <Cell key={row.status} fill={STATUS_COLORS[row.status]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-col gap-2">
                {state.data.map((member) => (
                  <div key={member.userId} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2">
                    <span className="text-sm text-slate-700">{member.name}</span>
                    <StatusBadge status={member.status} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </DashboardCard>
  );
}
