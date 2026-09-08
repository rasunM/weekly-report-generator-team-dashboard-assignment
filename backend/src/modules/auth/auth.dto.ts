import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.string().email("Must be a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  // Registration is allowed to set a role directly (assignment: "Role assignment (e.g. by an admin,
  // or at signup)"). Defaults to MEMBER so nobody accidentally self-registers as a manager by omission.
  role: z.enum(["MEMBER", "MANAGER"]).default("MEMBER"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof refreshSchema>;
