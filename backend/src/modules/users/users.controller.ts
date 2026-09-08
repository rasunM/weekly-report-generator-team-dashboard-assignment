import { Request, Response } from "express";
import { Role } from "@prisma/client";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { parsePagination } from "../../common/utils/pagination";
import { usersService } from "./users.service";
import { AppError } from "../../common/errors/AppError";

export const usersController = {
  me: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const user = await usersService.getById(req.user.id);
    res.json(user);
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const pagination = parsePagination(req);
    const role = req.query.role as Role | undefined;
    const search = req.query.search as string | undefined;
    const result = await usersService.list(pagination, { role, search });
    res.json(result);
  }),

  getProfile: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const result = await usersService.getProfileWithStats(userId);
    res.json(result);
  }),

  invite: asyncHandler(async (req: Request, res: Response) => {
    const user = await usersService.invite(req.body);
    res.status(201).json(user);
  }),

  updateRole: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const user = await usersService.updateRole(userId, req.body.role);
    res.json(user);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const { userId } = req.params;
    await usersService.remove(userId, req.user.id);
    res.status(204).send();
  }),
};
