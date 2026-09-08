import { Router } from "express";
import { requireAuth } from "../../common/middleware/auth.middleware";
import { requireRole } from "../../common/middleware/roles.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import { summaryQuerySchema, trendQuerySchema, activityFeedQuerySchema } from "./dashboard.dto";
import { dashboardController } from "./dashboard.controller";

const router = Router();

// The whole dashboard module is MANAGER-only (assignment section 4: "Team Dashboard (Manager View)").
router.use(requireAuth, requireRole("MANAGER"));

router.get("/summary", validate({ query: summaryQuerySchema }), dashboardController.summary);
router.get("/tasks-trend", validate({ query: trendQuerySchema }), dashboardController.tasksTrend);
router.get("/status-by-member", validate({ query: summaryQuerySchema }), dashboardController.statusByMember);
router.get("/workload-by-project", dashboardController.workloadByProject);
router.get("/hours-by-type", dashboardController.hoursByType);
router.get("/activity-feed", validate({ query: activityFeedQuerySchema }), dashboardController.activityFeed);

export default router;
