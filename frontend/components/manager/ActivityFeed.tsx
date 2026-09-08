"use client";

// "Recent Activity" - GET /api/dashboard/activity-feed merges real report submissions and review
// actions server-side, already sorted newest-first (dashboard.service.ts `getActivityFeed()`).
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { getActivityFeed } from "@/lib/api/dashboard";
import { ApiError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import type { ActivityFeedItem } from "@/types/dashboard";
import DashboardCard from "@/components/common/DashboardCard";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ErrorMessage from "@/components/common/ErrorMessage";
import EmptyState from "@/components/common/EmptyState";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: ActivityFeedItem[] };

function describe(item: ActivityFeedItem): string {
  switch (item.type) {
    case "SUBMITTED":
      return `${item.actor.name} submitted a report`;
    case "APPROVED":
      return `${item.actor.name} approved a report`;
    case "REQUEST_CHANGES":
      return `${item.actor.name} requested changes on a report`;
  }
}

const DOT_COLORS: Record<ActivityFeedItem["type"], string> = {
  SUBMITTED: "bg-blue-500",
  APPROVED: "bg-green-500",
  REQUEST_CHANGES: "bg-amber-500",
};

export default function ActivityFeed() {
  const { accessToken } = useAuth();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    getActivityFeed(accessToken, 15)
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ status: "error", message: err instanceof ApiError ? err.message : "Could not load recent activity." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return (
    <DashboardCard title="Recent Activity">
      {state.status === "loading" && <LoadingSpinner label="Loading..." />}
      {state.status === "error" && <ErrorMessage message={state.message} />}
      {state.status === "ready" &&
        (state.data.length === 0 ? (
          <EmptyState message="No recent activity yet." />
        ) : (
          <ul className="flex flex-col gap-3">
            {state.data.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT_COLORS[item.type]}`} />
                <div className="min-w-0 flex-1">
                  <Link href={`/reports/${item.reportId}`} className="text-sm text-slate-800 hover:underline">
                    {describe(item)}
                  </Link>
                  {"comment" in item && item.comment && (
                    <p className="mt-0.5 text-xs text-slate-500">&ldquo;{item.comment}&rdquo;</p>
                  )}
                  <p className="mt-0.5 text-xs text-slate-400">{formatDateTime(item.occurredAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        ))}
    </DashboardCard>
  );
}
