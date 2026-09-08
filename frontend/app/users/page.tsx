"use client";

// User Management (Feature 12). Every route this page calls is manager-only server-side
// (users.routes.ts `requireRole("MANAGER")`), so the page itself is gated the same way - unlike
// /projects, there's no "open to any role" read here to accommodate.
import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth/AuthContext";
import { listUsers, inviteUser, changeUserRole, removeUser } from "@/lib/api/users";
import { ApiError } from "@/lib/api/client";
import { formatDate } from "@/lib/format";
import type { Role, User } from "@/types/auth";
import InviteUserModal from "@/components/users/InviteUserModal";
import RemoveUserModal from "@/components/users/RemoveUserModal";
import Select from "@/components/common/Select";
import Input from "@/components/common/Input";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ErrorMessage from "@/components/common/ErrorMessage";
import EmptyState from "@/components/common/EmptyState";
import Button from "@/components/common/Button";
import PageHeader from "@/components/common/PageHeader";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: User[] };

const ROLE_FILTER_OPTIONS: { value: Role | ""; label: string }[] = [
  { value: "", label: "All roles" },
  { value: "MEMBER", label: "Team Member" },
  { value: "MANAGER", label: "Manager" },
];

export default function UsersPage() {
  return (
    <ProtectedRoute allowedRoles={["MANAGER"]}>
      <UsersContent />
    </ProtectedRoute>
  );
}

function UsersContent() {
  const { user: currentUser, accessToken } = useAuth();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [retryKey, setRetryKey] = useState(0);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [removingUser, setRemovingUser] = useState<User | null>(null);
  const [roleUpdating, setRoleUpdating] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setState({ status: "loading" });
    // search/role are real server-side query params (users.service.ts `list()`), not client-side
    // filtering of an over-fetched list.
    const handle = setTimeout(() => {
      listUsers(accessToken, { search: search || undefined, role: roleFilter || undefined })
        .then((result) => {
          if (!cancelled) setState({ status: "ready", data: result.items });
        })
        .catch((err) => {
          if (!cancelled) {
            setState({ status: "error", message: err instanceof ApiError ? err.message : "Could not load users." });
          }
        });
    }, 300); // debounce the search box so every keystroke doesn't fire a request
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [accessToken, search, roleFilter, retryKey]);

  async function handleInvite(input: { name: string; email: string; role: Role; temporaryPassword: string }) {
    if (!accessToken) return;
    await inviteUser(accessToken, input);
    setShowInviteModal(false);
    setNotice(`${input.name} was added.`);
    setRetryKey((k) => k + 1);
  }

  async function handleRoleChange(user: User, nextRole: Role) {
    if (!accessToken || nextRole === user.role) return;
    setRoleError(null);
    setRoleUpdating(user.id);
    try {
      await changeUserRole(accessToken, user.id, nextRole);
      setNotice(`${user.name}'s role was changed to ${nextRole === "MANAGER" ? "Manager" : "Team Member"}.`);
      setRetryKey((k) => k + 1);
    } catch (err) {
      setRoleError(err instanceof ApiError ? err.message : "Could not change this user's role.");
    } finally {
      setRoleUpdating(null);
    }
  }

  async function handleRemove() {
    if (!accessToken || !removingUser) return;
    await removeUser(accessToken, removingUser.id);
    setNotice(`${removingUser.name} was permanently removed.`);
    setRemovingUser(null);
    setRetryKey((k) => k + 1);
  }

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        title="Team Members"
        subtitle="Manage who has access and what role they have."
        action={<Button onClick={() => setShowInviteModal(true)}>Add Team Member</Button>}
      />

      {notice && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">{notice}</div>
      )}
      {roleError && (
        <div className="mb-4">
          <ErrorMessage message={roleError} />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-64">
          <Input
            label="Search"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            label="Role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as Role | "")}
            options={ROLE_FILTER_OPTIONS}
          />
        </div>
      </div>

      {state.status === "loading" && <LoadingSpinner label="Loading team members..." />}

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
          <EmptyState message={search || roleFilter ? "No team members match this search." : "No team members yet."} />
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Joined</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.data.map((user) => {
                  const isSelf = user.id === currentUser?.id;
                  return (
                    <tr key={user.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {user.name}
                        {isSelf && <span className="ml-2 text-xs font-normal text-slate-400">(you)</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{user.email}</td>
                      <td className="px-4 py-3">
                        <div className="w-36 sm:w-40">
                          <Select
                            aria-label={`Role for ${user.name}`}
                            value={user.role}
                            onChange={(e) => handleRoleChange(user, e.target.value as Role)}
                            options={[
                              { value: "MEMBER", label: "Team Member" },
                              { value: "MANAGER", label: "Manager" },
                            ]}
                            disabled={isSelf || roleUpdating === user.id}
                          />
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-slate-500 sm:table-cell">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3">
                        {isSelf ? (
                          <span className="text-xs text-slate-400">You can&apos;t remove your own account.</span>
                        ) : (
                          <button
                            onClick={() => setRemovingUser(user)}
                            className="text-sm font-medium text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        ))}

      {showInviteModal && <InviteUserModal onCancel={() => setShowInviteModal(false)} onSubmit={handleInvite} />}
      {removingUser && (
        <RemoveUserModal user={removingUser} onCancel={() => setRemovingUser(null)} onConfirm={handleRemove} />
      )}
    </div>
  );
}
