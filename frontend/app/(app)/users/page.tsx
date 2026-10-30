"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import {
  adminResetUserPassword,
  createUser,
  disableUser,
  enableUser,
  getRoles,
  getUsers,
  isHumanRole,
  roleHint,
  roleLabel,
  updateUser,
  type ApiRole,
  type ApiUser,
} from "@/features/users";
import { getAuthMe } from "@/features/auth";

const canonicalRoleOrder = [
  "PLATFORM_ADMIN",
  "ADMIN",
  "PORTFOLIO_MANAGER",
  "PROGRAM_MANAGER",
  "PROJECT_MANAGER",
  "CUSTOMER_SUCCESS_MANAGER",
  "EXECUTIVE",
  "SALES",
  "TEAM_MEMBER",
  "PARTNER",
  "CUSTOMER",
];

const statusOptions = ["active", "first_login_pending", "disabled"];
const sortOptions = [
  { label: "Created newest", value: "created_desc" },
  { label: "Created oldest", value: "created_asc" },
  { label: "Name A-Z", value: "name_asc" },
  { label: "Name Z-A", value: "name_desc" },
  { label: "Last login newest", value: "last_login_desc" },
] as const;

type SortMode = (typeof sortOptions)[number]["value"];

export default function UsersPage() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("created_desc");

  async function loadData() {
    setError(null);
    setIsLoading(true);
    try {
      const authMe = await getAuthMe();
      const platformAdmin = authMe.roles.some(
        (role) => role.name === "PLATFORM_ADMIN",
      );
      setIsPlatformAdmin(platformAdmin);
      if (!platformAdmin) {
        setUsers([]);
        setRoles([]);
        setError("Platform administrator access is required");
        return;
      }

      const [userData, roleData] = await Promise.all([getUsers(), getRoles()]);
      setUsers(userData);
      setRoles(orderRoles(roleData));
      setSelectedUserId((current) => current ?? userData[0]?.id ?? null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load user administration",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return users
      .filter((user) =>
        normalizedSearch
          ? [user.firstName, user.lastName, user.email]
              .join(" ")
              .toLowerCase()
              .includes(normalizedSearch)
          : true,
      )
      .filter((user) =>
        roleFilter === "all" || userRoleNames(user).includes(roleFilter),
      )
      .filter((user) =>
        statusFilter === "all" ? true : user.status === statusFilter,
      )
      .slice()
      .sort((left, right) => compareUsers(left, right, sortMode));
  }, [roleFilter, searchTerm, sortMode, statusFilter, users]);

  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;
  const editingUser = users.find((user) => user.id === editingUserId) ?? null;
  const resetUser = users.find((user) => user.id === resetUserId) ?? null;
  const kpis = useMemo(
    () => [
      { label: "Total Users", value: users.length },
      { label: "Active Users", value: users.filter((u) => u.status === "active").length },
      { label: "Disabled Users", value: users.filter((u) => u.status === "disabled").length },
      {
        label: "First Login Pending",
        value: users.filter((u) => u.status === "first_login_pending").length,
      },
    ],
    [users],
  );

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setToast(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const roleIds = formData.getAll("roleIds").map(String).filter(Boolean);
    const password = String(formData.get("password") ?? "");
    if (roleIds.length === 0) {
      setIsSaving(false);
      setError("Choose at least one role.");
      return;
    }

    try {
      await createUser({
        email: String(formData.get("email") ?? ""),
        firstName: String(formData.get("firstName") ?? ""),
        lastName: String(formData.get("lastName") ?? ""),
        roleId: roleIds[0],
        roleIds,
        ...(password ? { password } : {}),
      });
      form.reset();
      await loadData();
      setToast(
        password
          ? "User created. First login password change is required."
          : "Invitation created. The user signs in with Google.",
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create user");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEditUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser) return;
    setIsSaving(true);
    setError(null);
    setToast(null);
    const formData = new FormData(event.currentTarget);
    const roleIds = formData.getAll("roleIds").map(String).filter(Boolean);
    if (roleIds.length === 0) {
      setIsSaving(false);
      setError("Choose at least one role.");
      return;
    }

    try {
      await updateUser(editingUser.id, {
        email: String(formData.get("email") ?? ""),
        firstName: String(formData.get("firstName") ?? ""),
        lastName: String(formData.get("lastName") ?? ""),
        roleId: roleIds[0],
        roleIds,
      });
      setEditingUserId(null);
      await loadData();
      setToast("User updated.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update user");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetUser) return;
    setIsSaving(true);
    setError(null);
    setToast(null);
    const formData = new FormData(event.currentTarget);

    try {
      await adminResetUserPassword(
        resetUser.id,
        String(formData.get("temporaryPassword") ?? ""),
      );
      setResetUserId(null);
      await loadData();
      setToast("Temporary password set. First login password change is required.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to reset password");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLifecycle(user: ApiUser, action: "enable" | "disable") {
    setIsSaving(true);
    setError(null);
    setToast(null);
    try {
      if (action === "enable") {
        await enableUser(user.id);
        setToast("User enabled.");
      } else {
        await disableUser(user.id);
        setToast("User disabled.");
      }
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : `Unable to ${action} user`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description="Invite people, assign the roles they hold, and manage their access."
        eyebrow="Administration"
        title="People"
      />

      {error ? (
        <section className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </section>
      ) : null}
      {toast ? (
        <section className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {toast}
        </section>
      ) : null}

      {!isPlatformAdmin && !isLoading ? null : (
        <>
          <section className="grid gap-3 md:grid-cols-4">
            {kpis.map((kpi) => (
              <article className="rounded-md border border-slate-200 bg-white p-4 shadow-soft" key={kpi.label}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{kpi.label}</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{kpi.value}</p>
              </article>
            ))}
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold text-slate-950">Create User</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Leave the password blank to invite someone who signs in with Google. A password creates a local account.
            </p>
            <form className="mt-5 space-y-5" onSubmit={handleCreateUser}>
              <div className="grid gap-4 md:grid-cols-3">
                <TextField label="First Name" name="firstName" required />
                <TextField label="Last Name" name="lastName" required />
                <TextField label="Email" name="email" required type="email" />
              </div>
              <RoleChecklist roles={roles} />
              <div className="flex flex-col gap-4 border-t border-slate-100 pt-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="w-full max-w-sm">
                  <TextField autoComplete="new-password" label="Temporary Password" minLength={8} name="password" type="password" />
                  <p className="mt-1.5 text-xs leading-5 text-slate-500">Optional. At least 8 characters when set.</p>
                </div>
                <button className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-70" disabled={isSaving || roles.filter((role) => isHumanRole(role.name)).length === 0} type="submit">
                  Create User
                </button>
              </div>
            </form>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
            <div className="space-y-4">
              <section className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-soft md:grid-cols-4">
                <TextField label="Search" name="search" onChange={setSearchTerm} type="search" value={searchTerm} />
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Role</span>
                  <select className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20" onChange={(event) => setRoleFilter(event.target.value)} value={roleFilter}>
                    <option value="all">All roles</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.name}>{roleLabel(role.name)}</option>
                    ))}
                  </select>
                </label>
                <FilterSelect label="Status Filter" onChange={setStatusFilter} options={["all", ...statusOptions]} value={statusFilter} />
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Sort</span>
                  <select className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20" onChange={(event) => setSortMode(event.target.value as SortMode)} value={sortMode}>
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </section>

              <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-soft">
                <div className="hidden grid-cols-[1fr_1.2fr_1.3fr_0.8fr_0.8fr_0.8fr_210px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:grid">
                  <span>Name</span><span>Email</span><span>Roles</span><span>Status</span><span>Last Login</span><span>Created</span><span>Actions</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {isLoading ? <p className="px-4 py-6 text-sm text-slate-500">Loading users...</p> : null}
                  {!isLoading && filteredUsers.length === 0 ? <p className="px-4 py-6 text-sm text-slate-500">No users match the current filters.</p> : null}
                  {filteredUsers.map((user) => (
                    <article className="grid gap-2 px-4 py-4 text-sm lg:grid-cols-[1fr_1.2fr_1.3fr_0.8fr_0.8fr_0.8fr_210px] lg:items-center" key={user.id}>
                      <button className="text-left font-semibold text-slate-950 hover:text-brand" onClick={() => setSelectedUserId(user.id)} type="button">{displayName(user)}</button>
                      <span className="break-all text-slate-600">{user.email}</span>
                      <RoleChips names={userRoleNames(user)} />
                      <StatusBadge status={user.status} />
                      <span className="text-slate-600">{formatDate(user.lastLoginAt)}</span>
                      <span className="text-slate-600">{formatDate(user.createdAt)}</span>
                      <span className="flex flex-wrap gap-2">
                        <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50" onClick={() => setEditingUserId(user.id)} type="button">Edit</button>
                        <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50" onClick={() => setResetUserId(user.id)} type="button">Reset Password</button>
                        {user.status === "disabled" ? (
                          <button className="rounded-md border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50" disabled={isSaving} onClick={() => void handleLifecycle(user, "enable")} type="button">Enable</button>
                        ) : (
                          <button className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50" disabled={isSaving} onClick={() => void handleLifecycle(user, "disable")} type="button">Disable</button>
                        )}
                      </span>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <aside className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
              <h2 className="text-lg font-semibold text-slate-950">User Details</h2>
              {selectedUser ? (
                <div className="mt-4 space-y-5 text-sm">
                  <Detail label="Profile" value={displayName(selectedUser)} />
                  <Detail label="Contact Information" value={selectedUser.email} />
                  <div>
                    <p className="font-medium text-slate-700">Roles</p>
                    <div className="mt-2"><RoleChips names={userRoleNames(selectedUser)} /></div>
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Status</p>
                    <div className="mt-2"><StatusBadge status={selectedUser.status} /></div>
                  </div>
                  <Detail label="Last Login" value={formatDate(selectedUser.lastLoginAt)} />
                  <div>
                    <p className="font-medium text-slate-700">Account History</p>
                    <ul className="mt-2 space-y-2 text-slate-600">
                      {(selectedUser.accountHistory ?? []).length ? (selectedUser.accountHistory ?? []).slice().reverse().map((entry) => (
                        <li className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2" key={`${entry.action}-${entry.timestamp}`}>{entry.action} · {formatDate(entry.timestamp)}</li>
                      )) : <li>No account history recorded.</li>}
                    </ul>
                  </div>
                </div>
              ) : <p className="mt-4 text-sm text-slate-500">Select a user to review lifecycle details.</p>}
            </aside>
          </section>
        </>
      )}

      {editingUser ? (
        <ActionPanel title="Edit User" onClose={() => setEditingUserId(null)}>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleEditUser}>
            <TextField defaultValue={editingUser.firstName} label="First Name" name="firstName" required />
            <TextField defaultValue={editingUser.lastName} label="Last Name" name="lastName" required />
            <div className="md:col-span-2">
              <TextField defaultValue={editingUser.email} label="Email" name="email" required type="email" />
            </div>
            <div className="md:col-span-2">
              <RoleChecklist
                mode="edit"
                roles={roles}
                selectedIds={
                  editingUser.roles?.map((role) => role.id) ??
                  [editingUser.roleId ?? editingUser.role?.id ?? ""].filter(Boolean)
                }
              />
            </div>
            <div className="flex justify-end gap-3 md:col-span-2">
              <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" onClick={() => setEditingUserId(null)} type="button">Cancel</button>
              <button className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white" disabled={isSaving} type="submit">Save User</button>
            </div>
          </form>
        </ActionPanel>
      ) : null}

      {resetUser ? (
        <ActionPanel title={`Reset Password: ${displayName(resetUser)}`} onClose={() => setResetUserId(null)}>
          <form className="space-y-4" onSubmit={handleResetPassword}>
            <TextField label="Temporary Password" minLength={8} name="temporaryPassword" required type="password" />
            <div className="flex justify-end gap-3">
              <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" onClick={() => setResetUserId(null)} type="button">Cancel</button>
              <button className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white" disabled={isSaving} type="submit">Set Temporary Password</button>
            </div>
          </form>
        </ActionPanel>
      ) : null}
    </div>
  );
}

function TextField({ autoComplete, defaultValue, label, minLength, name, onChange, required, type = "text", value }: { autoComplete?: string; defaultValue?: string; label: string; minLength?: number; name: string; onChange?: (value: string) => void; required?: boolean; type?: string; value?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input autoComplete={autoComplete} className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20" defaultValue={defaultValue} minLength={minLength} name={name} onChange={onChange ? (event) => onChange(event.target.value) : undefined} required={required} type={type} value={value} />
    </label>
  );
}

function FilterSelect({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: string[]; value: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20" onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map((option) => <option key={option} value={option}>{option === "all" ? "All" : formatStatus(option)}</option>)}
      </select>
    </label>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="font-medium text-slate-700">{label}</p><p className="mt-1 text-slate-600">{value}</p></div>;
}

function ActionPanel({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <section className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-md border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700" onClick={onClose} type="button">Close</button>
        </div>
        {children}
      </div>
    </section>
  );
}

function userRoleNames(user: ApiUser) {
  if (user.roles?.length) {
    return user.roles.map((role) => role.name);
  }
  return user.role?.name ? [user.role.name] : [];
}

function RoleChecklist({
  mode = "create",
  roles,
  selectedIds = [],
}: {
  mode?: "create" | "edit";
  roles: ApiRole[];
  selectedIds?: string[];
}) {
  const visibleRoles = roles.filter(
    (role) => isHumanRole(role.name) || (mode === "edit" && selectedIds.includes(role.id)),
  );

  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-700">Roles</legend>
      <p className="mt-1 text-xs leading-5 text-slate-500">Select every role this person holds. Access is the combination of those roles.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {visibleRoles.map((role) => (
          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 px-3 py-2.5 transition hover:border-slate-300 has-[:checked]:border-brand has-[:checked]:bg-teal-50" key={role.id}>
            <input
              className="mt-0.5 accent-brand"
              defaultChecked={selectedIds.includes(role.id)}
              name="roleIds"
              type="checkbox"
              value={role.id}
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-slate-900">{roleLabel(role.name)}</span>
              {roleHint(role.name) ? <span className="mt-0.5 block text-xs leading-5 text-slate-500">{roleHint(role.name)}</span> : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function RoleChips({ names }: { names: string[] }) {
  if (names.length === 0) {
    return <span className="text-sm text-slate-400">Unassigned</span>;
  }

  return (
    <span className="flex flex-wrap gap-1">
      {names.map((name) => (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700" key={name}>
          {roleLabel(name)}
        </span>
      ))}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "active"
      ? "bg-emerald-50 text-emerald-700"
      : status === "disabled"
        ? "bg-slate-100 text-slate-600"
        : "bg-amber-50 text-amber-800";

  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{formatStatus(status)}</span>;
}

function orderRoles(roles: ApiRole[]) {
  return [...roles].sort((left, right) => roleSortIndex(left.name) - roleSortIndex(right.name));
}

function roleSortIndex(name: string) {
  const index = canonicalRoleOrder.indexOf(name);
  return index === -1 ? canonicalRoleOrder.length : index;
}

function compareUsers(left: ApiUser, right: ApiUser, sortMode: SortMode) {
  if (sortMode === "name_asc" || sortMode === "name_desc") {
    const result = displayName(left).localeCompare(displayName(right));
    return sortMode === "name_desc" ? -result : result;
  }
  if (sortMode === "last_login_desc") {
    return dateValue(right.lastLoginAt) - dateValue(left.lastLoginAt);
  }
  const result = dateValue(right.createdAt) - dateValue(left.createdAt);
  return sortMode === "created_asc" ? -result : result;
}

function displayName(user: ApiUser) {
  return `${user.firstName} ${user.lastName}`.trim() || user.email;
}

function formatDate(value?: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

function dateValue(value?: string | null) {
  return value ? new Date(value).getTime() : 0;
}

function formatStatus(value: string) {
  const labels: Record<string, string> = {
    active: "Active",
    disabled: "Disabled",
    first_login_pending: "First login pending",
  };
  return labels[value] ?? value.replaceAll("_", " ");
}
