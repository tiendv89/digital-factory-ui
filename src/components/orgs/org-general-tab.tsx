"use client";

import { AlertCircle, Check, CheckCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Avatar, Button, cn, Field, Input } from "@/components/common";
import { useOrg, useOrgMembers, useUpdateOrg } from "@/hooks/admin/use-org-settings";
import type { OrgRole } from "@/services/user-service";

import { ICON_COLORS } from "../settings/icon-colors";

interface OrgGeneralTabProps {
  orgId: string;
  userRole: OrgRole;
  orgColor: string;
}

export function OrgGeneralTab({ orgId, userRole, orgColor }: OrgGeneralTabProps) {
  const { org, loading, error } = useOrg(orgId);
  const updateOrgMutation = useUpdateOrg(orgId);
  const { members } = useOrgMembers(orgId);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [color, setColor] = useState(orgColor);
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
      {/* Identity header */}
      <div className="flex items-center gap-3">
        <Avatar name={name} color={color} shape="square" size="lg" />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-text-primary">{name}</p>
          <p className="truncate font-mono text-xs text-text-muted">/{slug}</p>
          <p className="mt-1 text-xs text-text-secondary">
            {members.length} {members.length === 1 ? "member" : "members"}
          </p>
        </div>
      </div>

      <Field label="Organization name">
        <Input
          value={name}
          readOnly={!canEdit}
          onChange={(e) => {
            setName(e.target.value);
            setDirty(true);
            setSaved(false);
          }}
          maxLength={120}
          placeholder="Organization name"
          aria-label="Organization name"
          className={!canEdit ? "cursor-not-allowed opacity-60" : undefined}
        />
      </Field>

      <Field label="Icon color">
        <div className="flex flex-wrap gap-2">
          {ICON_COLORS.map((c) => {
            const selected = c === color;
            return (
              <button
                key={c}
                type="button"
                disabled={!canEdit}
                onClick={() => setColor(c)}
                aria-label={`Icon color ${c}`}
                aria-pressed={selected}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-[8px] transition-transform hover:scale-105 disabled:cursor-not-allowed",
                  selected && "ring-2 ring-white/80 ring-offset-2 ring-offset-surface",
                )}
                style={{ background: c }}
              >
                {selected && <Check className="h-3.5 w-3.5 text-white" />}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="URL slug">
        <div className="flex items-center rounded-[8px] border border-border-control bg-surface-secondary focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
          <span className="px-3 text-sm text-text-muted">/</span>
          <input
            value={slug}
            readOnly={!canEdit}
            onChange={(e) => {
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
              setDirty(true);
              setSaved(false);
            }}
            maxLength={64}
            placeholder="org-slug"
            aria-label="Organization slug"
            className={cn("h-9 w-full rounded-r-[8px] bg-transparent pr-3 font-mono text-sm text-text-primary outline-none placeholder:text-text-muted", !canEdit && "cursor-not-allowed opacity-60")}
          />
        </div>
      </Field>

      {canEdit ? (
        <div className="flex items-center justify-end gap-3">
          {updateOrgMutation.error && <p className="text-xs text-danger">{updateOrgMutation.error.message}</p>}
          <Button
            variant="primary"
            onClick={() => void handleSave()}
            disabled={!dirty || updateOrgMutation.isPending}
            loading={updateOrgMutation.isPending}
            leftIcon={saved ? <CheckCircle className="h-3.5 w-3.5" /> : undefined}
            aria-label="Save organisation general settings"
          >
            {updateOrgMutation.isPending ? "Saving…" : saved ? "Saved" : "Save changes"}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-text-muted" role="note">
          You have read-only access to this organisation.
        </p>
      )}
    </div>
  );
}
