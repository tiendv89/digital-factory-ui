import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  adminAssignOrgPlan,
  adminAssignUserPlan,
  adminCreatePlan,
  adminListOrgs,
  adminListPlans,
  adminListUsers,
  adminRemoveOrgPlan,
  adminRemoveUserPlan,
  adminUpdatePlan,
} from "@/services/user-service";
import type {
  AssignOrgPlanRequest,
  AssignUserPlanRequest,
  CreateBillingPlanRequest,
  UpdateBillingPlanRequest,
} from "@/services/user-service";

export const ADMIN_PLANS_KEY = ["admin", "plans"] as const;
export const ADMIN_USERS_KEY = ["admin", "users"] as const;
export const ADMIN_ORGS_KEY = ["admin", "orgs"] as const;

export function useAdminPlans() {
  return useQuery({
    queryKey: ADMIN_PLANS_KEY,
    queryFn: adminListPlans,
  });
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBillingPlanRequest) => adminCreatePlan(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_PLANS_KEY });
    },
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, body }: { planId: string; body: UpdateBillingPlanRequest }) => adminUpdatePlan(planId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_PLANS_KEY });
    },
  });
}

export function useAdminUsers(page = 1, pageSize = 50) {
  return useQuery({
    queryKey: [...ADMIN_USERS_KEY, page, pageSize],
    queryFn: () => adminListUsers(page, pageSize),
  });
}

export function useAssignUserPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, body }: { userId: string; body: AssignUserPlanRequest }) => adminAssignUserPlan(userId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_USERS_KEY });
    },
  });
}

export function useRemoveUserPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => adminRemoveUserPlan(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_USERS_KEY });
    },
  });
}

export function useAdminOrgs(page = 1, pageSize = 50) {
  return useQuery({
    queryKey: [...ADMIN_ORGS_KEY, page, pageSize],
    queryFn: () => adminListOrgs(page, pageSize),
  });
}

export function useAssignOrgPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, body }: { orgId: string; body: AssignOrgPlanRequest }) => adminAssignOrgPlan(orgId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_ORGS_KEY });
    },
  });
}

export function useRemoveOrgPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orgId: string) => adminRemoveOrgPlan(orgId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_ORGS_KEY });
    },
  });
}
