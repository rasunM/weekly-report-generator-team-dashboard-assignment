import { prisma } from "../../common/prisma";
import { startOfIsoWeek, endOfIsoWeek, addWeeks } from "../../common/utils/week";

const SUBMITTED_LIKE_STATUSES = ["SUBMITTED", "NEEDS_CORRECTION", "APPROVED"] as const;

export const dashboardService = {
  // Summary metrics required by assignment section 6: total submitted this week, compliance rate,
  // needs-correction count, open blockers.
  async getSummary(weekStartInput?: string) {
    const weekStart = weekStartInput ? new Date(weekStartInput) : startOfIsoWeek(new Date());
    const weekEnd = endOfIsoWeek(weekStart);
    const today = new Date();

    const [members, reportsThisWeek] = await Promise.all([
      prisma.user.findMany({ where: { role: "MEMBER" }, select: { id: true } }),
      prisma.report.findMany({
        where: { weekStart },
        select: { id: true, userId: true, status: true, currentVersionId: true },
      }),
    ]);

    const reportByUser = new Map(reportsThisWeek.map((r) => [r.userId, r]));

    let submitted = 0;
    let pending = 0;
    let late = 0;
    const isPastDue = weekEnd < today;

    for (const member of members) {
      const report = reportByUser.get(member.id);
      const isSubmittedLike = report && (SUBMITTED_LIKE_STATUSES as readonly string[]).includes(report.status);
      if (isSubmittedLike) {
        submitted += 1;
      } else if (isPastDue) {
        late += 1;
      } else {
        pending += 1;
      }
    }

    const needsCorrectionCount = reportsThisWeek.filter((r) => r.status === "NEEDS_CORRECTION").length;

    // "Open" blockers = blockers on any report that hasn't reached APPROVED yet, for the selected
    // week - i.e. issues that are still actively unresolved from the manager's point of view.
    const openVersions = await prisma.reportVersion.findMany({
      where: {
        report: { weekStart, status: { not: "APPROVED" } },
        id: { in: reportsThisWeek.map((r) => r.currentVersionId).filter((id): id is string => !!id) },
      },
      select: { blockers: true },
    });
    const openBlockersCount = openVersions.reduce((sum, v) => {
      const blockers = (v.blockers as { text: string; isKey: boolean }[]) ?? [];
      return sum + blockers.length;
    }, 0);

    return {
      weekStart,
      weekEnd,
      totalReportsSubmittedThisWeek: submitted,
      complianceRate: {
        submitted,
        pending,
        late,
        totalMembers: members.length,
        ratePct: members.length > 0 ? Math.round((submitted / members.length) * 100) : 0,
      },
      needsCorrectionCount,
      openBlockersCount,
    };
  },

  // "Tasks completed trend over time (per person or team-wide)" - counts completed task entries
  // per week, across the last N weeks, optionally scoped to one member.
  async getTasksCompletedTrend(weeksBack: number, userId?: string) {
    const now = startOfIsoWeek(new Date());
    const earliestWeek = addWeeks(now, -(weeksBack - 1));

    const versions = await prisma.reportVersion.findMany({
      where: {
        report: {
          weekStart: { gte: earliestWeek },
          ...(userId ? { userId } : {}),
        },
      },
      select: {
        report: { select: { weekStart: true } },
        taskEntries: { select: { status: true } },
      },
    });

    const byWeek = new Map<string, number>();
    for (let i = 0; i < weeksBack; i++) {
      byWeek.set(addWeeks(earliestWeek, i).toISOString().slice(0, 10), 0);
    }

    for (const v of versions) {
      const key = v.report.weekStart.toISOString().slice(0, 10);
      const completedCount = v.taskEntries.filter((t) => t.status.toLowerCase() === "completed").length;
      byWeek.set(key, (byWeek.get(key) ?? 0) + completedCount);
    }

    return Array.from(byWeek.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([weekStart, tasksCompleted]) => ({ weekStart, tasksCompleted }));
  },

  // "Report submission/approval status by team member" for a given week.
  async getStatusByMember(weekStartInput?: string) {
    const weekStart = weekStartInput ? new Date(weekStartInput) : startOfIsoWeek(new Date());

    const members = await prisma.user.findMany({
      where: { role: "MEMBER" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        reports: { where: { weekStart }, select: { status: true } },
      },
    });

    return members.map((m) => ({
      userId: m.id,
      name: m.name,
      status: m.reports[0]?.status ?? "NOT_STARTED",
    }));
  },

  // "Workload / task distribution by project" - task entry counts grouped by project, across
  // reports' current versions (i.e. the latest content, not superseded versions).
  async getWorkloadByProject() {
    const reports = await prisma.report.findMany({
      where: { currentVersionId: { not: null } },
      select: {
        project: { select: { id: true, name: true } },
        currentVersion: { select: { taskEntries: { select: { id: true } } } },
      },
    });

    const byProject = new Map<string, { projectId: string | null; projectName: string; taskCount: number }>();
    for (const r of reports) {
      const key = r.project?.id ?? "unassigned";
      const name = r.project?.name ?? "Unassigned";
      const existing = byProject.get(key) ?? { projectId: r.project?.id ?? null, projectName: name, taskCount: 0 };
      existing.taskCount += r.currentVersion?.taskEntries.length ?? 0;
      byProject.set(key, existing);
    }

    return Array.from(byProject.values()).sort((a, b) => b.taskCount - a.taskCount);
  },

  // "Time spent by task type, team-wide" - sums HoursEntry.hours across all current versions.
  async getHoursByType() {
    const entries = await prisma.hoursEntry.groupBy({
      by: ["type"],
      _sum: { hours: true },
      where: { reportVersion: { currentOfReport: { isNot: null } } },
    });

    return entries.map((e) => ({ type: e.type, totalHours: e._sum.hours ?? 0 }));
  },

  // "Recent reports / activity feed, including recent review actions" - merges recently-submitted
  // reports and recent manager review actions into one reverse-chronological feed.
  async getActivityFeed(limit: number) {
    const [recentSubmissions, recentReviews] = await Promise.all([
      prisma.reportVersion.findMany({
        where: { submittedAt: { not: null } },
        orderBy: { submittedAt: "desc" },
        take: limit,
        select: {
          submittedAt: true,
          report: { select: { id: true, user: { select: { id: true, name: true } } } },
        },
      }),
      prisma.reviewComment.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          action: true,
          comment: true,
          createdAt: true,
          reportId: true,
          reviewer: { select: { id: true, name: true } },
        },
      }),
    ]);

    const feed = [
      ...recentSubmissions.map((s) => ({
        type: "SUBMITTED" as const,
        occurredAt: s.submittedAt as Date,
        reportId: s.report.id,
        actor: s.report.user,
      })),
      ...recentReviews.map((r) => ({
        type: r.action as "APPROVED" | "REQUEST_CHANGES",
        occurredAt: r.createdAt,
        reportId: r.reportId,
        actor: r.reviewer,
        comment: r.comment,
      })),
    ];

    return feed.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()).slice(0, limit);
  },
};
