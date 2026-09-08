import { z } from "zod";

// A manager can only ever set status/comment, never touch report content - enforced by these DTOs
// simply not having any content fields (assignment: "Enforce this with a separate DTO for the
// manager's PATCH endpoint that simply doesn't include content fields, rather than trusting the
// frontend to not send them").
//
// Two separate schemas/endpoints (approve vs request-changes) rather than one generic "action" body:
// the assignment ties the comment requirement specifically to Request Changes ("leaving one general
// comment explaining what needs correction"), while Approve doesn't require one.
export const approveSchema = z.object({
  comment: z.string().max(2000).optional(),
});
export type ApproveInput = z.infer<typeof approveSchema>;

export const requestChangesSchema = z.object({
  comment: z.string().min(1, "A comment explaining what needs correction is required").max(2000),
});
export type RequestChangesInput = z.infer<typeof requestChangesSchema>;

export const reportIdParamsSchema = z.object({
  reportId: z.string().uuid(),
});
