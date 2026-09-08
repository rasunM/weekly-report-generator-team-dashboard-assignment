import { Request, Response } from "express";
import { ReportStatus } from "@prisma/client";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { parsePagination } from "../../common/utils/pagination";
import { reportsService } from "./reports.service";
import { AppError } from "../../common/errors/AppError";

export const reportsController = {
  // GET /api/reports - doubles as "own report history" (member) and "team report list" (manager),
  // per role. A member can never see another member's reports through this endpoint, regardless of
  // what userId query param they pass - it's simply ignored for them (assignment RBAC requirement).
  list: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const pagination = parsePagination(req);
    const status = req.query.status as ReportStatus | undefined;
    const projectId = req.query.projectId as string | undefined;

    if (req.user.role === "MANAGER") {
      const userId = req.query.userId as string | undefined;
      const weekStart = req.query.weekStart as string | undefined;
      const weekEnd = req.query.weekEnd as string | undefined;
      const result = await reportsService.listForManager(pagination, {
        status,
        projectId,
        userId,
        weekStart,
        weekEnd,
      });
      return res.json(result);
    }

    const result = await reportsService.listForUser(req.user.id, pagination, { status, projectId });
    res.json(result);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const report = await reportsService.create(req.user.id, req.body);
    res.status(201).json(report);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const report = await reportsService.getById(req.params.reportId, req.user);
    res.json(report);
  }),

  getVersion: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const versionNumber = parseInt(req.params.versionNumber, 10);
    const version = await reportsService.getVersion(req.params.reportId, versionNumber, req.user);
    res.json(version);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const report = await reportsService.update(req.params.reportId, req.user.id, req.body);
    res.json(report);
  }),

  submit: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const report = await reportsService.submit(req.params.reportId, req.user.id);
    res.json(report);
  }),
};
