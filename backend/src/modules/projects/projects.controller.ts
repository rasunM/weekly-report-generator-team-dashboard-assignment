import { Request, Response } from "express";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { parsePagination } from "../../common/utils/pagination";
import { projectsService } from "./projects.service";

export const projectsController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const pagination = parsePagination(req);
    const isActive = req.query.isActive === undefined ? undefined : req.query.isActive === "true";
    const result = await projectsService.list(pagination, { isActive });
    res.json(result);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const project = await projectsService.getById(req.params.projectId);
    res.json(project);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const project = await projectsService.create(req.body);
    res.status(201).json(project);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const project = await projectsService.update(req.params.projectId, req.body);
    res.json(project);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const result = await projectsService.remove(req.params.projectId);
    res.status(200).json(result);
  }),

  assignMembers: asyncHandler(async (req: Request, res: Response) => {
    const result = await projectsService.assignMembers(req.params.projectId, req.body.userIds);
    res.json(result);
  }),

  unassignMember: asyncHandler(async (req: Request, res: Response) => {
    await projectsService.unassignMember(req.params.projectId, req.params.userId);
    res.status(204).send();
  }),
};
