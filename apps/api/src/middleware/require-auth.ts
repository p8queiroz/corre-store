import type { AppRole } from "@stride/shared";
import { hasMinimumRole } from "@stride/shared";
import type { ApiContext } from "../context.js";
import { AppError } from "./error-handler.js";

export function requireAuth(ctx: ApiContext): SessionUser {
  if (!ctx.session) {
    throw new AppError(401, "Authentication required", "UNAUTHORIZED");
  }
  return {
    userId: ctx.session.userId,
    role: ctx.session.role,
    email: ctx.session.email,
  };
}

export interface SessionUser {
  userId: string;
  role: AppRole;
  email: string;
}

export function requireRole(ctx: ApiContext, role: AppRole): SessionUser {
  const user = requireAuth(ctx);
  if (!hasMinimumRole(user.role, role)) {
    throw new AppError(403, "Insufficient permissions", "FORBIDDEN");
  }
  return user;
}
