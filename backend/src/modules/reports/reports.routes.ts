import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../common/middleware/auth.middleware";
import { requireRole } from "../../common/middleware/roles.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import {
  createReportSchema,
  updateReportSchema,
  listReportsQuerySchema,
  reportIdParamsSchema,
} from "./reports.dto";
import { reportsController } from "./reports.controller";

const router = Router();

router.use(requireAuth);

router.get("/", validate({ query: listReportsQuerySchema }), reportsController.list);

// Report creation/editing/submission is a MEMBER action only - managers interact with reports
// through /api/review (approve / request changes), never by writing report content directly
// (assignment: managers "should only be able to edit the status/comment fields").
router.post("/", requireRole("MEMBER"), validate({ body: createReportSchema }), reportsController.create);

router.get("/:reportId", validate({ params: reportIdParamsSchema }), reportsController.getById);
router.get(
  "/:reportId/versions/:versionNumber",
  validate({ params: reportIdParamsSchema.extend({ versionNumber: z.string().regex(/^\d+$/) }) }),
  reportsController.getVersion
);

router.patch(
  "/:reportId",
  requireRole("MEMBER"),
  validate({ params: reportIdParamsSchema, body: updateReportSchema }),
  reportsController.update
);
router.post(
  "/:reportId/submit",
  requireRole("MEMBER"),
  validate({ params: reportIdParamsSchema }),
  reportsController.submit
);

export default router;
