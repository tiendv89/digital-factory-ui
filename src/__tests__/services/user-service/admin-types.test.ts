import { describe, expect, it } from "vitest";

import type { AdminOrg, AdminUser, AssignOrgPlanRequest, AssignUserPlanRequest, BillingPlan, CreateBillingPlanRequest, EffectivePlan, UpdateBillingPlanRequest } from "@/services/user-service";

const basePlan: BillingPlan = {
  id: "plan-1",
  name: "pro",
  display_name: "Pro",
  daily_credits_cap: 1000,
  weekly_credits_cap: 5000,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("BillingPlan", () => {
  it("accepts a plan with caps", () => {
    expect(basePlan.name).toBe("pro");
    expect(basePlan.daily_credits_cap).toBe(1000);
  });

  it("accepts 0 caps (unlimited)", () => {
    const unlimited: BillingPlan = {
      ...basePlan,
      daily_credits_cap: 0,
      weekly_credits_cap: 0,
    };
    expect(unlimited.daily_credits_cap).toBe(0);
    expect(unlimited.weekly_credits_cap).toBe(0);
  });
});

describe("CreateBillingPlanRequest", () => {
  it("requires name, display_name and caps (0 = unlimited)", () => {
    const req: CreateBillingPlanRequest = {
      name: "team",
      display_name: "Team",
      daily_credits_cap: 500,
      weekly_credits_cap: 0,
    };
    expect(req.name).toBe("team");
    expect(req.weekly_credits_cap).toBe(0);
  });
});

describe("UpdateBillingPlanRequest", () => {
  it("allows partial update (display_name only)", () => {
    const req: UpdateBillingPlanRequest = { display_name: "Pro Plus" };
    expect(req.display_name).toBe("Pro Plus");
    expect(req.daily_credits_cap).toBeUndefined();
  });

  it("allows setting cap to 0 to make unlimited", () => {
    const req: UpdateBillingPlanRequest = { daily_credits_cap: 0 };
    expect(req.daily_credits_cap).toBe(0);
  });
});

describe("EffectivePlan", () => {
  it("has source individual for directly assigned plan", () => {
    const ep: EffectivePlan = {
      plan: basePlan,
      source: "individual",
      assigned_at: "2026-01-01T00:00:00Z",
      expires_at: null,
    };
    expect(ep.source).toBe("individual");
    expect(ep.expires_at).toBeNull();
  });

  it("has source org for org-inherited plan", () => {
    const ep: EffectivePlan = {
      plan: basePlan,
      source: "org",
      assigned_at: "2026-01-01T00:00:00Z",
      expires_at: null,
    };
    expect(ep.source).toBe("org");
  });

  it("has source free for default plan", () => {
    const ep: EffectivePlan = {
      plan: { ...basePlan, name: "free", display_name: "Free" },
      source: "free",
      assigned_at: null,
      expires_at: null,
    };
    expect(ep.source).toBe("free");
  });
});

describe("AdminUser", () => {
  it("has an effective_plan field that can be null", () => {
    const user: AdminUser = {
      id: "u1",
      email: "test@example.com",
      display_name: null,
      username: null,
      effective_plan: null,
    };
    expect(user.effective_plan).toBeNull();
  });

  it("has an effective_plan field with plan details", () => {
    const user: AdminUser = {
      id: "u1",
      email: "test@example.com",
      display_name: "Test User",
      username: "test_user",
      effective_plan: {
        plan: basePlan,
        source: "individual",
        assigned_at: "2026-01-01T00:00:00Z",
        expires_at: null,
      },
    };
    expect(user.effective_plan?.plan.display_name).toBe("Pro");
    expect(user.effective_plan?.source).toBe("individual");
  });
});

describe("AdminOrg", () => {
  it("has an effective_plan field that can be null", () => {
    const org: AdminOrg = {
      id: "org1",
      name: "Test Org",
      slug: "test-org",
      effective_plan: null,
    };
    expect(org.effective_plan).toBeNull();
  });
});

describe("AssignUserPlanRequest", () => {
  it("requires plan_id", () => {
    const req: AssignUserPlanRequest = { plan_id: "plan-1" };
    expect(req.plan_id).toBe("plan-1");
    expect(req.expires_at).toBeUndefined();
  });

  it("accepts optional expires_at", () => {
    const req: AssignUserPlanRequest = {
      plan_id: "plan-1",
      expires_at: "2027-01-01T00:00:00Z",
    };
    expect(req.expires_at).toBe("2027-01-01T00:00:00Z");
  });
});

describe("AssignOrgPlanRequest", () => {
  it("requires plan_id", () => {
    const req: AssignOrgPlanRequest = { plan_id: "plan-1" };
    expect(req.plan_id).toBe("plan-1");
  });
});
