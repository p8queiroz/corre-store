import type { AppRole } from "../roles.js";

/**
 * iron-session payload — kept minimal; full user loaded from DB when needed.
 * See docs/03-authentication.md
 */
export interface SessionData {
  userId: string;
  role: AppRole;
  email: string;
}

export interface SessionExtensions {
  session: SessionData;
}
