"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import {
  adminResetUserPassword,
  createUser,
  disableUser,
  enableUser,
  getRoles,
  getUsers,
  updateUser,
  type ApiRole,
  type ApiUser,
} from "@/features/users";
import { getAuthMe } from "@/features/auth";

const canonicalRoleOrder = [
  "PLATFORM_ADMIN",
  "PORTFOLIO_MANAGER",
  "PROJECT_MANAGER",
  "TEAM_MEMBER",
  "EXECUTIVE",
  "CUSTOMER",
  "PARTNER",
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
        roleFilter === "all" ? true : user.role?.name === roleFilter,
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

    try {
      await createUser({
        email: String(formData.get("email") ?? ""),
        firstName: String(formData.get("firstName") ?? ""),
        lastName: String(formData.get("lastName") ?? ""),
        password: String(formData.get("password") ?? ""),
        roleId: String(formData.get("roleId") ?? ""),
      });
      form.reset();
      await loadData();
      setToast("User created. First login password change is required.");
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

    try {
      await updateUser(editingUser.id, {
        email: String(formData.get("email") ?? ""),
        firstName: String(formData.get("firstName") ?? ""),
        lastName: String(formData.get("lastName") ?? ""),
        roleId: String(formData.get("roleId") ?? ""),
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
        description="Centralized lifecycle administration for enterprise identities."
        eyebrow="Administration"
        title="User Administration"
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
            <form className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_1.2fr_1fr_1fr_auto] lg:items-end" onSubmit={handleCreateUser}>
              <TextField label="First Name" name="firstName" required />
              <TextField label="Last Name" name="lastName" required />
              <TextField label="Email" name="email" required type="email" />
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Role</span>
                <select className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20" name="roleId" required>
                  <option value="">Choose role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </label>
              <TextField label="Temporary Password" minLength={8} name="password" required type="password" />
              <button className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-70" disabled={isSaving || roles.length === 0} type="submit">
                Create User
              </button>
            </form>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
            <div className="space-y-4">
              <section className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-soft md:grid-cols-4">
                <TextField label="Search" name="search" onChange={setSearchTerm} type="search" value={searchTerm} />
                <FilterSelect label="Role Filter" onChange={setRoleFilter} options={["all", ...roles.map((role) => role.name)]} value={roleFilter} />
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
                <div className="hidden grid-cols-[1fr_1.3fr_1fr_0.8fr_0.9fr_0.9fr_210px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:grid">
                  <span>Name</span><span>Email</span><span>Role</span><span>Status</span><span>Last Login</span><span>Created Date</span><span>Actions</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {isLoading ? <p className="px-4 py-6 text-sm text-slate-500">Loading users...</p> : null}
                  {!isLoading && filteredUsers.length === 0 ? <p className="px-4 py-6 text-sm text-slate-500">No users match the current filters.</p> : null}
                  {filteredUsers.map((user) => (
                    <article className="grid gap-2 px-4 py-4 text-sm lg:grid-cols-[1fr_1.3fr_1fr_0.8fr_0.9fr_0.9fr_210px] lg:items-center" key={user.id}>
                      <button className="text-left font-semibold text-slate-950 hover:text-brand" onClick={() => setSelectedUserId(user.id)} type="button">{displayName(user)}</button>
                      <span className="text-slate-600">{user.email}</span>
                      <span className="text-slate-600">{user.role?.name ?? "Unassigned"}</span>
                      <span className="capitalize text-slate-700">{formatStatus(user.status)}</span>
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
                  <Detail label="Role" value={selectedUser.role?.name ?? "Unassigned"} />
                  <Detail label="Status" value={formatStatus(selectedUser.status)} />
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
            <TextField defaultValue={editingUser.email} label="Email" name="email" required type="email" />
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Role</span>
              <select className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20" defaultValue={editingUser.roleId ?? editingUser.role?.id ?? ""} name="roleId" required>
                {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
              </select>
            </label>
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

function TextField({ defaultValue, label, minLength, name, onChange, required, type = "text", value }: { defaultValue?: string; label: string; minLength?: number; name: string; onChange?: (value: string) => void; required?: boolean; type?: string; value?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20" defaultValue={defaultValue} minLength={minLength} name={name} onChange={onChange ? (event) => onChange(event.target.value) : undefined} required={required} type={type} value={value} />
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
      <div className="w-full max-w-2xl rounded-md border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700" onClick={onClose} type="button">Close</button>
        </div>
        {children}
      </div>
    </section>
  );
}

function orderRoles(roles: ApiRole[]) {
  return [...roles].sort((left, right) => canonicalRoleOrder.indexOf(left.name) - canonicalRoleOrder.indexOf(right.name));
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
  return value.replaceAll("_", " ");
}
