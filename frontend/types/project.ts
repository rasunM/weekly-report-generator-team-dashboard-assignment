// Mirrors backend/src/modules/projects/projects.service.ts `list()` item shape exactly.
export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  reportCount: number;
  assignedMemberCount: number;
}

export interface ListProjectsQuery {
  page?: number;
  pageSize?: number;
  isActive?: boolean;
}

// Mirrors backend/src/modules/projects/projects.dto.ts exactly.
// POST /api/projects - `name` required (1-120 chars), `description` optional (max 1000),
// `isActive` optional (defaults to true server-side if omitted).
export interface CreateProjectInput {
  name: string;
  description?: string;
  isActive?: boolean;
}

// PATCH /api/projects/:id - every field optional; only the ones sent are changed. `isActive` can
// be toggled directly here (independent of DELETE's own soft-delete behavior).
export interface UpdateProjectInput {
  name?: string;
  description?: string;
  isActive?: boolean;
}

// DELETE /api/projects/:id response - never the project object. `softDeleted: true` means the
// project had reports referencing it and was deactivated (isActive: false) instead of removed;
// `false` means it had no reports and was actually deleted.
export interface DeleteProjectResult {
  softDeleted: boolean;
}
