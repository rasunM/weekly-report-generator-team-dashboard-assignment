import { z } from "zod";

export const listUsersQuerySchema = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  role: z.enum(["MEMBER", "MANAGER"]).optional(),
  search: z.string().optional(),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

// Manager-driven "invite" - creates the account directly with a temporary password rather than a
// real email-invite flow (out of scope for this assignment's timebox); the manager communicates the
// temporary password out of band and the new user can be expected to change it after first login in
// a real product. Kept explicit here rather than silently reusing /auth/register so user management
// stays a manager-only action distinct from public self-registration.
export const inviteUserSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  role: z.enum(["MEMBER", "MANAGER"]).default("MEMBER"),
  temporaryPassword: z.string().min(8),
});
export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export const updateUserRoleSchema = z.object({
  role: z.enum(["MEMBER", "MANAGER"]),
});
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

export const userIdParamsSchema = z.object({
  userId: z.string().uuid(),
});
