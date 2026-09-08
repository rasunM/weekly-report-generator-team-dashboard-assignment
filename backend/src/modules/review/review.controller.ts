import { Request, Response } from "express";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { reviewService } from "./review.service";
import { AppError } from "../../common/errors/AppError";

export const reviewController = {
  approve: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const report = await reviewService.approve(req.params.reportId, req.user.id, req.body.comment);
    res.json(report);
  }),

  requestChanges: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const report = await reviewService.requestChanges(req.params.reportId, req.user.id, req.body.comment);
    res.json(report);
  }),

  history: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const history = await reviewService.getHistory(req.params.reportId, req.user);
    res.json(history);
  }),
};
