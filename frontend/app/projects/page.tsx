"use client";

// Projects / Categories management (Feature 11). GET /api/projects is open to any authenticated
// user (projects.routes.ts - members need the list to tag their own reports), so this page itself
// has no role gate; only the write actions (Add / Edit / Delete) are conditionally rendered for
// role === "MANAGER", matching the backend's own `requireRole("MANAGER")` guard on those three
// endpoints exactly - the backend remains the real authorization boundary regardless.
import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth/AuthContext";
import { listProjects, createProject, updateProject, deleteProject } from "@/lib/api/projects";
import { ApiError } from "@/lib/api/client";
import { formatDate } from "@/lib/format";
import type { ProjectSummary } from "@/types/project";
import ProjectFormModal from "@/components/projects/ProjectFormModal";
import DeleteProjectModal from "@/components/projects/DeleteProjectModal";
import Select from "@/components/common/Select";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ErrorMessage from "@/components/common/ErrorMessage";
import EmptyState from "@/components/common/EmptyState";
import Button from "@/components/common/Button";
import PageHeader from "@/components/common/PageHeader";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: ProjectSummary[] };

const ACTIVE_FILTER_OPTIONS = [
  { value: "", label: "All projects" },
  { value: "true", label: "Active only" },
  { value: "false", label: "Inactive only" },
];

export default function ProjectsPage() {
  return (
    <ProtectedRoute>
      <ProjectsContent />
    </ProtectedRoute>
  );
}

function ProjectsContent() {
  const { accessToken, role } = useAuth();
  const isManager = role === "MANAGER";
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("");
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [retryKey, setRetryKey] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectSummary | null>(null);
  const [deletingProject, setDeletingProject] = useState<ProjectSummary | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function load() {
    if (!accessToken) return;
    let cancelled = false;
    setState({ status: "loading" });
    listProjects(accessToken, { isActive: activeFilter === "" ? undefined : activeFilter === "true" })
      .then((result) => {
        if (!cancelled) setState({ status: "ready", data: result.items });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ status: "error", message: err instanceof ApiError ? err.message : "Could not load projects." });
        }
      });
    return () => {
      cancelled = true;
    };
  }

  useEffect(() => {
    return load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, activeFilter, retryKey]);

  async function handleAdd(input: { name: string; description?: string; isActive: boolean }) {
    if (!accessToken) return;
    await createProject(accessToken, { name: input.name, description: input.description, isActive: input.isActive });
    setShowAddModal(false);
    setNotice(`"${input.name}" was added.`);
    setRetryKey((k) => k + 1);
  }

  async function handleEdit(input: { name: string; description?: string; isActive: boolean }) {
    if (!accessToken || !editingProject) return;
    await updateProject(accessToken, editingProject.id, input);
    setEditingProject(null);
    setNotice(`"${input.name}" was updated.`);
    setRetryKey((k) => k + 1);
  }

  async function handleDelete() {
    if (!accessToken || !deletingProject) return;
    const result = await deleteProject(accessToken, deletingProject.id);
    setNotice(
      result.softDeleted
        ? `"${deletingProject.name}" has reports attached, so it was deactivated instead of removed.`
        : `"${deletingProject.name}" was permanently removed.`
    );
    setDeletingProject(null);
    setRetryKey((k) => k + 1);
  }

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        title="Projects"
        subtitle="The projects and categories weekly reports can be tagged with."
        action={isManager && <Button onClick={() => setShowAddModal(true)}>Add Project</Button>}
      />

      {notice && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">{notice}</div>
      )}

      <div className="mb-4 w-full sm:w-56">
        <Select
          aria-label="Filter by status"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value as "" | "true" | "false")}
          options={ACTIVE_FILTER_OPTIONS}
        />
      </div>

      {state.status === "loading" && <LoadingSpinner label="Loading projects..." />}

      {state.status === "error" && (
        <div className="flex flex-col items-start gap-3">
          <ErrorMessage message={state.message} />
          <Button variant="secondary" onClick={() => setRetryKey((k) => k + 1)}>
            Retry
          </Button>
        </div>
      )}

      {state.status === "ready" &&
        (state.data.length === 0 ? (
          <EmptyState message={activeFilter ? "No projects match this filter." : "No projects have been created yet."} />
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Description</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Reports</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Members</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Created</th>
                  {isManager && <th className="px-4 py-3 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {state.data.map((project) => (
                  <tr key={project.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{project.name}</td>
                    <td className="hidden max-w-xs truncate px-4 py-3 text-slate-600 md:table-cell">{project.description || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          project.isActive ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {project.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">{project.reportCount}</td>
                    <td className="hidden px-4 py-3 text-slate-600 md:table-cell">{project.assignedMemberCount}</td>
                    <td className="hidden px-4 py-3 text-slate-500 sm:table-cell">{formatDate(project.createdAt)}</td>
                    {isManager && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setEditingProject(project)}
                            className="text-sm font-medium text-slate-700 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeletingProject(project)}
                            className="text-sm font-medium text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        ))}

      {showAddModal && <ProjectFormModal onCancel={() => setShowAddModal(false)} onSubmit={handleAdd} />}
      {editingProject && (
        <ProjectFormModal project={editingProject} onCancel={() => setEditingProject(null)} onSubmit={handleEdit} />
      )}
      {deletingProject && (
        <DeleteProjectModal project={deletingProject} onCancel={() => setDeletingProject(null)} onConfirm={handleDelete} />
      )}
    </div>
  );
}
