import { z } from "zod";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const summaryQuerySchema = z.object({
  weekStart: dateStr.optional(),
});

export const trendQuerySchema = z.object({
  weeks: z.string().regex(/^\d+$/).optional(),
  userId: z.string().uuid().optional(),
});

export const activityFeedQuerySchema = z.object({
  limit: z.string().regex(/^\d+$/).optional(),
});
