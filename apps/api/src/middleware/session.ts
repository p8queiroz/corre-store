import type { Request, Response, NextFunction } from "express";
import { getIronSession } from "iron-session";
import type { SessionData } from "@stride/shared";
import { env } from "../config/env.js";

/**
 * iron-session encrypts session data in an HTTP-only cookie.
 * Unlike raw JWT in localStorage, this reduces XSS token theft risk.
 * See docs/03-authentication.md
 */
export const sessionOptions = {
  password: env.SESSION_SECRET,
  cookieName: "stride_session",
  cookieOptions: {
    secure: env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export async function sessionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  req.session = await getIronSession<SessionData>(req, res, sessionOptions);
  next();
}

declare module "express-serve-static-core" {
  interface Request {
    session: Awaited<ReturnType<typeof getIronSession<SessionData>>>;
  }
}
