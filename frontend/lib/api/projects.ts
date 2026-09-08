// GET /api/projects and GET /api/projects/:id are open to any authenticated user (needed to tag
// reports); POST/PATCH/DELETE are MANAGER-only server-side (projects.routes.ts `requireRole
// ("MANAGER")`) - the /projects management page (Feature 11) hides those controls for a MEMBER,
// but the real authorization boundary is the backend, same convention as every other feature.
import { apiRequest } from "./client";
import type { CreateProjectInput, DeleteProjectResult, ListProjectsQuery, ProjectSummary, UpdateProjectInput } from "@/types/project";
import type { PaginatedResult } from "@/types/report";

function toQueryString(query: ListProjectsQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

// Active projects only, and a generous page size - report creation needs the full pickable list in
// one call, not a paginated picker (projectsService.list() default pageSize is 20; 100 comfortably
// covers a demo/seeded dataset while still respecting the backend's own MAX_PAGE_SIZE of 100).
export function listActiveProjects(accessToken: string) {
  return apiRequest<PaginatedResult<ProjectSummary>>(`/projects${toQueryString({ isActive: true, pageSize: 100 })}`, {
    token: accessToken,
  });
}

// General listing for the /projects management page - shows everything (active and inactive) by
// default so a manager can see the outcome of a soft-delete, unlike listActiveProjects above which
// exists purely to populate report-form pickers. `query.isActive` lets the page filter either way;
// omitting it (as the page's default view does) returns both.
export function listProjects(accessToken: string, query: ListProjectsQuery = {}) {
  return apiRequest<PaginatedResult<ProjectSummary>>(`/projects${toQueryString({ pageSize: 100, ...query })}`, {
    token: accessToken,
  });
}

// POST /api/projects - MANAGER only. No duplicate-name check server-side (no unique constraint on
// name - projects.dto.ts/schema.prisma), so this can succeed even if a project with the same name
// already exists; nothing to guard against here that the backend doesn't already allow.
export function createProject(accessToken: string, input: CreateProjectInput) {
  return apiRequest<ProjectSummary>("/projects", { method: "POST", body: input, token: accessToken });
}

// PATCH /api/projects/:id - MANAGER only. Only the fields present in `input` are changed.
export function updateProject(accessToken: string, projectId: string, input: UpdateProjectInput) {
  return apiRequest<ProjectSummary>(`/projects/${projectId}`, { method: "PATCH", body: input, token: accessToken });
}

// DELETE /api/projects/:id - MANAGER only. Soft-deletes (isActive: false) instead of removing when
// the project has reports referencing it; hard-deletes otherwise. Response is `{ softDeleted }`
// only, never the project - the caller must refetch the list to see the result.
export function deleteProject(accessToken: string, projectId: string) {
  return apiRequest<DeleteProjectResult>(`/projects/${projectId}`, { method: "DELETE", token: accessToken });
}
