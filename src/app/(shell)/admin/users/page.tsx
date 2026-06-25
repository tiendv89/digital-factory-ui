"use client";

import { useState } from "react";

import { Card } from "@/components/common";
import { useAdminUsers } from "@/hooks/admin/use-admin-plans";
import type { AdminUser } from "@/services/user-service";

export default function AdminUsersPage() {
  const [page] = useState(1);
  const { data, isLoading, error } = useAdminUsers(page);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (error) {
    return <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">Failed to load users: {(error as Error).message}</div>;
  }

  const users: AdminUser[] = data?.users ?? [];

  return (
    <div data-admin-users className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Users</h1>
        <span className="text-sm text-text-muted">{data?.total ?? 0} total</span>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-secondary text-left text-text-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">Email</th>
              <th className="px-4 py-2.5 font-medium">Display Name</th>
              <th className="px-4 py-2.5 font-medium">Username</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-surface-secondary/50">
                <td className="px-4 py-2.5 text-text-primary">{user.email}</td>
                <td className="px-4 py-2.5 text-text-secondary">{user.display_name || "—"}</td>
                <td className="px-4 py-2.5 text-text-secondary">{user.username || "—"}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-text-muted">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <p className="text-xs text-text-muted">Plans are managed per organization — see the Orgs tab.</p>
    </div>
  );
}
