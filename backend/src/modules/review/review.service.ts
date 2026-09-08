import { prisma } from "../../common/prisma";
import { AppError } from "../../common/errors/AppError";
import { reportsService } from "../reports/reports.service";

// The workflow guard from architecture-plan.md section 5, made explicit and central: a manager
// action is only valid against a report that is currently SUBMITTED. This lives here (not in the
// frontend) so the API itself rejects an out-of-sequence review call.
async function loadSubmittedReport(reportId: string) {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) throw AppError.notFound("Report not found");
  if (report.status !== "SUBMITTED") {
    throw AppError.badRequest(
      `Only SUBMITTED reports can be reviewed. This report is currently ${report.status}.`
    );
  }
  if (!report.currentVersionId) {
    throw AppError.badRequest("Report has no submitted version to review");
  }
  return report;
}

export const reviewService = {
  async approve(reportId: string, reviewerId: string, comment: string | undefined) {
    const report = await loadSubmittedReport(reportId);

    await prisma.$transaction([
      prisma.report.update({ where: { id: reportId }, data: { status: "APPROVED" } }),
      prisma.reviewComment.create({
        data: {
          reportId,
          reportVersionId: report.currentVersionId as string,
          reviewerId,
          action: "APPROVED",
          comment: comment ?? "Approved.",
        },
      }),
    ]);

    return reportsService.getById(reportId, { id: reviewerId, role: "MANAGER" });
  },

  async requestChanges(reportId: string, reviewerId: string, comment: string) {
    const report = await loadSubmittedReport(reportId);

    await prisma.$transaction([
      prisma.report.update({ where: { id: reportId }, data: { status: "NEEDS_CORRECTION" } }),
      prisma.reviewComment.create({
        data: {
          reportId,
          reportVersionId: report.currentVersionId as string,
          reviewerId,
          action: "REQUEST_CHANGES",
          comment,
        },
      }),
    ]);

    return reportsService.getById(reportId, { id: reviewerId, role: "MANAGER" });
  },

  // Full comment history per report (bonus per assignment section 3: "keep a short history of
  // previous review comments per report, rather than only the latest one"). reports.service's
  // getById() already returns this list, but exposed standalone too for a dedicated
  // "review history" UI panel without pulling the whole report payload.
  async getHistory(reportId: string, requester: { id: string; role: "MEMBER" | "MANAGER" }) {
    const report = await prisma.report.findUnique({ where: { id: reportId }, select: { id: true, userId: true } });
    if (!report) throw AppError.notFound("Report not found");
    if (requester.role === "MEMBER" && report.userId !== requester.id) {
      throw AppError.forbidden("You can only view review history for your own reports");
    }

    return prisma.reviewComment.findMany({
      where: { reportId },
      orderBy: { createdAt: "desc" },
      include: { reviewer: { select: { id: true, name: true } } },
    });
  },
};
