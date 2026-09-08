import { Request, Response } from "express";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { dashboardService } from "./dashboard.service";

export const dashboardController = {
  summary: asyncHandler(async (req: Request, res: Response) => {
    const result = await dashboardService.getSummary(req.query.weekStart as string | undefined);
    res.json(result);
  }),

  tasksTrend: asyncHandler(async (req: Request, res: Response) => {
    const weeks = req.query.weeks ? parseInt(req.query.weeks as string, 10) : 8;
    const userId = req.query.userId as string | undefined;
    const result = await dashboardService.getTasksCompletedTrend(weeks, userId);
    res.json(result);
  }),

  statusByMember: asyncHandler(async (req: Request, res: Response) => {
    const result = await dashboardService.getStatusByMember(req.query.weekStart as string | undefined);
    res.json(result);
  }),

  workloadByProject: asyncHandler(async (_req: Request, res: Response) => {
    const result = await dashboardService.getWorkloadByProject();
    res.json(result);
  }),

  hoursByType: asyncHandler(async (_req: Request, res: Response) => {
    const result = await dashboardService.getHoursByType();
    res.json(result);
  }),

  activityFeed: asyncHandler(async (req: Request, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const result = await dashboardService.getActivityFeed(limit);
    res.json(result);
  }),
};
