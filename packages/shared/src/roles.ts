export type AppRole = "USER" | "SELLER" | "ADMIN";

/** Role hierarchy for authorization checks */
const ROLE_RANK: Record<AppRole, number> = {
  USER: 1,
  SELLER: 2,
  ADMIN: 3,
};

export function hasMinimumRole(userRole: AppRole, required: AppRole): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[required];
}

export const PUBLIC_SIGNUP_ROLES = ["USER", "SELLER"] as const;
