import { Prisma, ReportStatus, Role } from "@prisma/client";
import { prisma } from "../../common/prisma";
import { AppError } from "../../common/errors/AppError";
import { paginated, PaginationParams } from "../../common/utils/pagination";
import { CreateReportInput, ReportContentInput, UpdateReportInput } from "./reports.dto";

// Statuses in which a MEMBER is allowed to edit their own report's content. Enforced here in the
// service layer (not just implied by frontend UI state) per the assignment's explicit requirement
// that ownership/workflow rules "can't be bypassed by a differently-routed call".
const EDITABLE_STATUSES: ReportStatus[] = ["DRAFT", "NEEDS_CORRECTION"];

function emptyContent(): ReportContentInput {
  return { tasksCompleted: [], tasksPlannedNextWeek: [], blockers: [], achievements: [], hoursByType: [] };
}

// Shapes a ReportVersion (+ its TaskEntry/HoursEntry children) back into the flat content object the
// API accepts on create/update - keeps the request and response bodies symmetrical.
function versionToContent(version: {
  tasksPlannedNextWeek: Prisma.JsonValue;
  blockers: Prisma.JsonValue;
  achievements: Prisma.JsonValue;
  notes: string | null;
  taskEntries: {
    taskName: string;
    priority: string;
    plannedPct: number;
    actualPct: number;
    status: string;
    timePlannedHrs: number | null;
    timeSpentHrs: number | null;
    deliverable: string | null;
  }[];
  hoursEntries: { type: string; hours: number }[];
}) {
  return {
    tasksCompleted: version.taskEntries.map((t) => ({
      taskName: t.taskName,
      priority: t.priority,
      plannedPct: t.plannedPct,
      actualPct: t.actualPct,
      status: t.status,
      timePlannedHrs: t.timePlannedHrs ?? undefined,
      timeSpentHrs: t.timeSpentHrs ?? undefined,
      deliverable: t.deliverable ?? undefined,
    })),
    tasksPlannedNextWeek: (version.tasksPlannedNextWeek as string[]) ?? [],
    blockers: (version.blockers as { text: string; isKey: boolean }[]) ?? [],
    achievements: (version.achievements as { text: string; isKey: boolean }[]) ?? [],
    hoursByType: version.hoursEntries.map((h) => ({ type: h.type, hours: h.hours })),
    notes: version.notes ?? undefined,
  };
}

function versionInclude() {
  return { taskEntries: { orderBy: { sortOrder: "asc" as const } }, hoursEntries: true };
}

async function assertAccess(reportId: string, requester: { id: string; role: Role }) {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) throw AppError.notFound("Report not found");

  // The ownership rule from the assignment: "Team members must only be able to see and edit their
  // own reports. Managers must be able to see every team member's reports." Checked here, against
  // the database record - not against anything the client claims - so it can't be spoofed.
  if (requester.role === "MEMBER" && report.userId !== requester.id) {
    throw AppError.forbidden("You can only access your own reports");
  }
  return report;
}

export const reportsService = {
  async create(userId: string, input: CreateReportInput) {
    const weekStart = new Date(input.weekStart);
    const weekEnd = new Date(input.weekEnd);
    if (weekEnd < weekStart) {
      throw AppError.badRequest("weekEnd cannot be before weekStart");
    }

    const existing = await prisma.report.findFirst({
      where: { userId, weekStart, projectId: input.projectId ?? null },
    });
    if (existing) {
      throw AppError.conflict("A report for this week and project already exists");
    }

    const content = input.content ?? emptyContent();

    const report = await prisma.$transaction(async (tx) => {
      const created = await tx.report.create({
        data: { userId, weekStart, weekEnd, projectId: input.projectId, status: "DRAFT" },
      });

      const version = await tx.reportVersion.create({
        data: {
          reportId: created.id,
          versionNumber: 1,
          blockers: content.blockers,
          achievements: content.achievements,
          tasksPlannedNextWeek: content.tasksPlannedNextWeek,
          notes: content.notes,
          taskEntries: {
            create: content.tasksCompleted.map((t, i) => ({ ...t, sortOrder: i })),
          },
          hoursEntries: { create: content.hoursByType },
        },
      });

      return tx.report.update({
        where: { id: created.id },
        data: { currentVersionId: version.id },
      });
    });

    return reportsService.getById(report.id, { id: userId, role: "MEMBER" });
  },

  // Central edit rule (assignment section 3 + version-history bonus): while the report is still
  // DRAFT, or the version currently attached has never been submitted, edits mutate that SAME
  // version in place. The moment a version HAS been submitted (submittedAt is set - meaning a
  // manager may have already reviewed/commented on it), any further edit snapshots a brand NEW
  // version instead of overwriting it, so the version a manager's comment was made against never
  // changes underneath them.
  async update(reportId: string, userId: string, input: UpdateReportInput) {
    const report = await assertAccess(reportId, { id: userId, role: "MEMBER" });
    if (report.userId !== userId) {
      throw AppError.forbidden("You can only edit your own reports");
    }
    if (!EDITABLE_STATUSES.includes(report.status)) {
      throw AppError.badRequest(
        `Report cannot be edited while status is ${report.status}. Only DRAFT or NEEDS_CORRECTION reports are editable.`
      );
    }

    const currentVersion = report.currentVersionId
      ? await prisma.reportVersion.findUnique({ where: { id: report.currentVersionId } })
      : null;
    if (!currentVersion) throw AppError.notFound("Report has no current version");

    const needsNewVersion = currentVersion.submittedAt !== null;

    const updated = await prisma.$transaction(async (tx) => {
      // Report-level metadata (week/project) is only allowed to change before the first submission,
      // to avoid a week/project identity shift on a report that's already partway through review.
      if (report.status === "DRAFT" && (input.weekStart || input.weekEnd || input.projectId !== undefined)) {
        await tx.report.update({
          where: { id: reportId },
          data: {
            weekStart: input.weekStart ? new Date(input.weekStart) : undefined,
            weekEnd: input.weekEnd ? new Date(input.weekEnd) : undefined,
            projectId: input.projectId === undefined ? undefined : input.projectId,
          },
        });
      }

      let versionId = currentVersion.id;

      if (needsNewVersion) {
        const versionCount = await tx.reportVersion.count({ where: { reportId } });
        const newVersion = await tx.reportVersion.create({
          data: {
            reportId,
            versionNumber: versionCount + 1,
            blockers: input.content.blockers,
            achievements: input.content.achievements,
            tasksPlannedNextWeek: input.content.tasksPlannedNextWeek,
            notes: input.content.notes,
            taskEntries: { create: input.content.tasksCompleted.map((t, i) => ({ ...t, sortOrder: i })) },
            hoursEntries: { create: input.content.hoursByType },
          },
        });
        await tx.report.update({ where: { id: reportId }, data: { currentVersionId: newVersion.id } });
        versionId = newVersion.id;
      } else {
        // Still the same never-submitted version - replace its content in place rather than piling
        // up rows for every autosave.
        await tx.taskEntry.deleteMany({ where: { reportVersionId: versionId } });
        await tx.hoursEntry.deleteMany({ where: { reportVersionId: versionId } });
        await tx.reportVersion.update({
          where: { id: versionId },
          data: {
            blockers: input.content.blockers,
            achievements: input.content.achievements,
            tasksPlannedNextWeek: input.content.tasksPlannedNextWeek,
            notes: input.content.notes,
            taskEntries: { create: input.content.tasksCompleted.map((t, i) => ({ ...t, sortOrder: i })) },
            hoursEntries: { create: input.content.hoursByType },
          },
        });
      }

      return tx.report.findUniqueOrThrow({ where: { id: reportId } });
    });

    return reportsService.getById(updated.id, { id: userId, role: "MEMBER" });
  },

  // DRAFT --submit--> SUBMITTED, or NEEDS_CORRECTION --edit+resubmit--> SUBMITTED (assignment's
  // required status flow, section 3). Stamps the current version's submittedAt, which is also the
  // signal `update()` above uses to decide whether the NEXT edit needs a new version.
  async submit(reportId: string, userId: string) {
    const report = await assertAccess(reportId, { id: userId, role: "MEMBER" });
    if (report.userId !== userId) {
      throw AppError.forbidden("You can only submit your own reports");
    }
    if (!EDITABLE_STATUSES.includes(report.status)) {
      throw AppError.badRequest(`Report cannot be submitted while status is ${report.status}`);
    }
    if (!report.currentVersionId) {
      throw AppError.badRequest("Report has no content to submit");
    }

    await prisma.$transaction([
      prisma.reportVersion.update({
        where: { id: report.currentVersionId },
        data: { submittedAt: new Date() },
      }),
      prisma.report.update({ where: { id: reportId }, data: { status: "SUBMITTED" } }),
    ]);

    return reportsService.getById(reportId, { id: userId, role: "MEMBER" });
  },

  async getById(reportId: string, requester: { id: string; role: Role }) {
    await assertAccess(reportId, requester);

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        project: true,
        currentVersion: { include: versionInclude() },
        reviewComments: {
          orderBy: { createdAt: "desc" },
          include: { reviewer: { select: { id: true, name: true } } },
        },
      },
    });
    if (!report) throw AppError.notFound("Report not found");

    const versionSummaries = await prisma.reportVersion.findMany({
      where: { reportId },
      orderBy: { versionNumber: "desc" },
      select: { id: true, versionNumber: true, submittedAt: true, createdAt: true },
    });

    return {
      id: report.id,
      status: report.status,
      weekStart: report.weekStart,
      weekEnd: report.weekEnd,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      user: report.user,
      project: report.project ? { id: report.project.id, name: report.project.name } : null,
      currentVersion: report.currentVersion
        ? {
            id: report.currentVersion.id,
            versionNumber: report.currentVersion.versionNumber,
            submittedAt: report.currentVersion.submittedAt,
            content: versionToContent(report.currentVersion),
          }
        : null,
      // "a simple list of past versions with submission timestamps, viewable on demand" - fetch full
      // content for one via getVersion() below rather than inlining every version's content here.
      versionHistory: versionSummaries,
      reviewComments: report.reviewComments.map((c) => ({
        id: c.id,
        action: c.action,
        comment: c.comment,
        createdAt: c.createdAt,
        reportVersionId: c.reportVersionId,
        reviewer: c.reviewer,
      })),
    };
  },

  // Fetches one specific past version's full content on demand (assignment: "viewable on demand"),
  // e.g. for a manager comparing the version under review against an earlier attempt.
  async getVersion(reportId: string, versionNumber: number, requester: { id: string; role: Role }) {
    await assertAccess(reportId, requester);

    const version = await prisma.reportVersion.findUnique({
      where: { reportId_versionNumber: { reportId, versionNumber } },
      include: versionInclude(),
    });
    if (!version) throw AppError.notFound("Report version not found");

    return {
      id: version.id,
      versionNumber: version.versionNumber,
      submittedAt: version.submittedAt,
      createdAt: version.createdAt,
      content: versionToContent(version),
    };
  },

  // Own report history (assignment section 2: "View own report history, organized by week, with
  // current status").
  async listForUser(userId: string, params: PaginationParams, filters: { status?: ReportStatus; projectId?: string }) {
    const where: Prisma.ReportWhereInput = {
      userId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
    };

    const [reports, totalCount] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: { weekStart: "desc" },
        skip: params.skip,
        take: params.take,
        include: { project: true },
      }),
      prisma.report.count({ where }),
    ]);

    return paginated(reports.map(summarize), totalCount, params);
  },

  // Manager dashboard's report list, with the filters required by assignment section 4: team
  // member, project/category, date range, status.
  async listForManager(
    params: PaginationParams,
    filters: {
      status?: ReportStatus;
      projectId?: string;
      userId?: string;
      weekStart?: string;
      weekEnd?: string;
    }
  ) {
    const where: Prisma.ReportWhereInput = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(filters.weekStart ? { weekStart: { gte: new Date(filters.weekStart) } } : {}),
      ...(filters.weekEnd ? { weekEnd: { lte: new Date(filters.weekEnd) } } : {}),
    };

    const [reports, totalCount] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: { weekStart: "desc" },
        skip: params.skip,
        take: params.take,
        include: { project: true, user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.report.count({ where }),
    ]);

    return paginated(reports.map(summarize), totalCount, params);
  },
};

function summarize(report: {
  id: string;
  status: ReportStatus;
  weekStart: Date;
  weekEnd: Date;
  updatedAt: Date;
  project: { id: string; name: string } | null;
  user?: { id: string; name: string; email: string };
}) {
  return {
    id: report.id,
    status: report.status,
    weekStart: report.weekStart,
    weekEnd: report.weekEnd,
    updatedAt: report.updatedAt,
    project: report.project ? { id: report.project.id, name: report.project.name } : null,
    user: report.user,
  };
}
