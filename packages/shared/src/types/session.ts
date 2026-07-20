import type { AppRole } from "../roles.js";

/**
 * iron-session payload — kept minimal; full user loaded from DB when needed.
 * See docs/PROJECT.md, "Authentication"
 */
export interface SessionData {
  userId: string;
  role: AppRole;
  email: string;
  stravaOAuthState?: {
    value: string;
    userId: string;
    expiresAt: number;
  };
}

export interface SessionExtensions {
  session: SessionData;
}
