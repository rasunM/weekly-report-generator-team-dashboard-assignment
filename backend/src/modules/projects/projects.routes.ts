import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../common/middleware/auth.middleware";
import { requireRole } from "../../common/middleware/roles.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import {
  createProjectSchema,
  updateProjectSchema,
  listProjectsQuerySchema,
  projectIdParamsSchema,
  assignMembersSchema,
} from "./projects.dto";
import { projectsController } from "./projects.controller";

const router = Router();

router.use(requireAuth);

// Every team member can read the project list/detail (needed to tag their own reports); only
// managers can mutate projects or manage assignments.
router.get("/", validate({ query: listProjectsQuerySchema }), projectsController.list);
router.get("/:projectId", validate({ params: projectIdParamsSchema }), projectsController.getById);

router.post("/", requireRole("MANAGER"), validate({ body: createProjectSchema }), projectsController.create);
router.patch(
  "/:projectId",
  requireRole("MANAGER"),
  validate({ params: projectIdParamsSchema, body: updateProjectSchema }),
  projectsController.update
);
router.delete(
  "/:projectId",
  requireRole("MANAGER"),
  validate({ params: projectIdParamsSchema }),
  projectsController.remove
);

router.post(
  "/:projectId/members",
  requireRole("MANAGER"),
  validate({ params: projectIdParamsSchema, body: assignMembersSchema }),
  projectsController.assignMembers
);
router.delete(
  "/:projectId/members/:userId",
  requireRole("MANAGER"),
  validate({ params: projectIdParamsSchema.extend({ userId: z.string().uuid() }) }),
  projectsController.unassignMember
);

export default router;
