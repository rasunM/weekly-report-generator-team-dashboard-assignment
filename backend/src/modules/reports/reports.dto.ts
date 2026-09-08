import { z } from "zod";

const taskEntrySchema = z.object({
  taskName: z.string().min(1).max(200),
  priority: z.string().min(1).max(50),
  plannedPct: z.number().int().min(0).max(100),
  actualPct: z.number().int().min(0).max(100),
  status: z.string().min(1).max(50),
  timePlannedHrs: z.number().min(0).optional(),
  timeSpentHrs: z.number().min(0).optional(),
  deliverable: z.string().max(500).optional(),
});

const flaggableEntrySchema = z.object({
  text: z.string().min(1).max(1000),
  isKey: z.boolean().default(false),
});

const hoursEntrySchema = z.object({
  type: z.enum(["DEVELOPMENT", "TESTING", "MEETINGS", "DOCUMENTATION", "OTHER"]),
  hours: z.number().min(0).max(168),
});

// Fixed, identical shape for every user's report (assignment section 2: "must not be able to
// customize, reorder, or add their own fields") - the schema itself is what enforces that rule, since
// the API rejects anything that doesn't match it.
export const reportContentSchema = z.object({
  tasksCompleted: z.array(taskEntrySchema).default([]),
  tasksPlannedNextWeek: z.array(z.string().min(1).max(500)).default([]),
  blockers: z.array(flaggableEntrySchema).default([]),
  achievements: z.array(flaggableEntrySchema).default([]),
  hoursByType: z.array(hoursEntrySchema).default([]),
  notes: z.string().max(2000).optional(),
});
export type ReportContentInput = z.infer<typeof reportContentSchema>;

export const createReportSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "weekStart must be YYYY-MM-DD"),
  weekEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "weekEnd must be YYYY-MM-DD"),
  projectId: z.string().uuid().optional(),
  content: reportContentSchema.optional(),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;

export const updateReportSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  weekEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  projectId: z.string().uuid().nullable().optional(),
  content: reportContentSchema,
});
export type UpdateReportInput = z.infer<typeof updateReportSchema>;

export const listReportsQuerySchema = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  status: z.enum(["DRAFT", "SUBMITTED", "NEEDS_CORRECTION", "APPROVED"]).optional(),
  projectId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(), // manager-only filter; ignored/overridden for members
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  weekEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type ListReportsQuery = z.infer<typeof listReportsQuerySchema>;

export const reportIdParamsSchema = z.object({
  reportId: z.string().uuid(),
});
