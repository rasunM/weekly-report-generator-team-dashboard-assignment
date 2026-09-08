import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().default(true),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const listProjectsQuerySchema = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  isActive: z.enum(["true", "false"]).optional(),
});

export const projectIdParamsSchema = z.object({
  projectId: z.string().uuid(),
});

export const assignMembersSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1),
});
