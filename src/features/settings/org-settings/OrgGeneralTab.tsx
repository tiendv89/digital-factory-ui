"use client";

import { useState, useEffect } from "react";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useOrg, useUpdateOrg } from "@/features/admin/hooks/useOrgSettings";
import type { OrgRole } from "@/services/user-service";

interface OrgGeneralTabProps {
  orgId: string;
  userRole: OrgRole;
}

export function OrgGeneralTab({ orgId, userRole }: OrgGeneralTabProps) {
  const { org, loading, error } = useOrg(orgId);
  const updateOrgMutation = useUpdateOrg(orgId);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (org) {
      setName(org.name);
      setSlug(org.slug);
    }
  }, [org]);

  const canEdit = userRole === "admin" || userRole === "platform_admin";

  const handleSave = async () => {
    await updateOrgMutation.mutateAsync({ name: name.trim(), slug: slug.trim() });
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-text-muted" data-org-general-loading>
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        <span className="text-sm">Loading org…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-8 text-danger" data-org-general-error>
        <AlertCircle className="h-4 w-4" aria-hidden />
        <span className="text-sm">Failed to load org: {error.message}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-org-general>
      <section aria-labelledby="org-general-heading">
        <h3
          id="org-general-heading"
          className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-muted"
        >
          General
        </h3>
        <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
          {/* Name */}
          <div>
            <label
              htmlFor="org-name"
              className="mb-1.5 block text-xs font-medium text-text-secondary"
            >
              Organisation name
            </label>
            <input
              id="org-name"
              type="text"
              value={name}
              readOnly={!canEdit}
              onChange={(e) => {
                setName(e.target.value);
                setDirty(true);
                setSaved(false);
              }}
              maxLength={120}
              placeholder="Organisation name"
              aria-label="Organisation name"
              className={
                "w-full rounded border border-border bg-surface-secondary px-3 py-1.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted " +
                (canEdit
                  ? "focus:border-primary focus:ring-1 focus:ring-primary"
                  : "cursor-not-allowed opacity-60")
              }
            />
          </div>

          {/* Slug */}
          <div>
            <label
              htmlFor="org-slug"
              className="mb-1.5 block text-xs font-medium text-text-secondary"
            >
              Slug
            </label>
            <input
              id="org-slug"
              type="text"
              value={slug}
              readOnly={!canEdit}
              onChange={(e) => {
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                setDirty(true);
                setSaved(false);
              }}
              maxLength={64}
              placeholder="org-slug"
              aria-label="Organisation slug"
              className={
                "w-full rounded border border-border bg-surface-secondary px-3 py-1.5 font-mono text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted " +
                (canEdit
                  ? "focus:border-primary focus:ring-1 focus:ring-primary"
                  : "cursor-not-allowed opacity-60")
              }
            />
          </div>

          {canEdit && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={!dirty || updateOrgMutation.isPending}
                aria-label="Save organisation general settings"
                className="flex items-center gap-1.5 rounded border border-border bg-surface-secondary px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-nav-item-hover hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {updateOrgMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : saved ? (
                  <CheckCircle className="h-3.5 w-3.5 text-success" aria-hidden />
                ) : null}
                {updateOrgMutation.isPending ? "Saving…" : saved ? "Saved" : "Save changes"}
              </button>
              {updateOrgMutation.error && (
                <p className="text-xs text-danger">{updateOrgMutation.error.message}</p>
              )}
            </div>
          )}

          {!canEdit && (
            <p className="text-xs text-text-muted" role="note">
              You have read-only access to this organisation.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
