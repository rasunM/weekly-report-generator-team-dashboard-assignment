import { Router } from "express";
import { requireAuth } from "../../common/middleware/auth.middleware";
import { requireRole } from "../../common/middleware/roles.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import {
  listUsersQuerySchema,
  inviteUserSchema,
  updateUserRoleSchema,
  userIdParamsSchema,
} from "./users.dto";
import { usersController } from "./users.controller";

const router = Router();

router.use(requireAuth);

// Any authenticated user can read their own basic profile.
router.get("/me", usersController.me);

// Everything below is manager-only: team roster, per-member profile (US-*: "Team member profile
// page"), and the "User management page (admin)" invite/remove/role-assignment actions.
router.get("/", requireRole("MANAGER"), validate({ query: listUsersQuerySchema }), usersController.list);
router.get(
  "/:userId/profile",
  requireRole("MANAGER"),
  validate({ params: userIdParamsSchema }),
  usersController.getProfile
);
router.post("/", requireRole("MANAGER"), validate({ body: inviteUserSchema }), usersController.invite);
router.patch(
  "/:userId/role",
  requireRole("MANAGER"),
  validate({ params: userIdParamsSchema, body: updateUserRoleSchema }),
  usersController.updateRole
);
router.delete(
  "/:userId",
  requireRole("MANAGER"),
  validate({ params: userIdParamsSchema }),
  usersController.remove
);

export default router;
