import { Router } from "express";
import { requireAuth } from "../../common/middleware/auth.middleware";
import { requireRole } from "../../common/middleware/roles.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import { approveSchema, requestChangesSchema, reportIdParamsSchema } from "./review.dto";
import { reviewController } from "./review.controller";

const router = Router();

router.use(requireAuth);

// Approve / Request Changes are MANAGER-only actions (assignment: "Manager / Admin ... review/approve
// submitted reports"). History is readable by the report's own member too (ownership checked in the
// service), so they can see manager feedback on their own report page.
router.post(
  "/:reportId/approve",
  requireRole("MANAGER"),
  validate({ params: reportIdParamsSchema, body: approveSchema }),
  reviewController.approve
);
router.post(
  "/:reportId/request-changes",
  requireRole("MANAGER"),
  validate({ params: reportIdParamsSchema, body: requestChangesSchema }),
  reviewController.requestChanges
);
router.get("/:reportId/history", validate({ params: reportIdParamsSchema }), reviewController.history);

export default router;
