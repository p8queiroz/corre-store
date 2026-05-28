import type { IncomingMessage, ServerResponse } from "node:http";
import type { Request, Response } from "express";
import { prisma } from "@stride/database";
import type { SessionData } from "@stride/shared";
import { getIronSession } from "iron-session";
import { sessionOptions } from "./middleware/session.js";

export interface ApiContext extends Record<string, unknown> {
  prisma: typeof prisma;
  session: SessionData | null;
  userId: string | null;
  req?: Request | IncomingMessage;
  res?: Response | ServerResponse;
}

type ContextInput =
  | { req: Request; res?: Response }
  | IncomingMessage
  | { req: IncomingMessage; res?: ServerResponse };

export async function createContext(input: ContextInput): Promise<ApiContext> {
  const req =
    "headers" in input && "method" in input
      ? (input as Request | IncomingMessage)
      : (input as { req: Request }).req;

  const res =
    "res" in input && input.res
      ? input.res
      : undefined;

  let session: SessionData | null = null;

  if (res && "headers" in req) {
    const iron = await getIronSession<SessionData>(req, res, sessionOptions);
    if (iron.userId) {
      session = {
        userId: iron.userId,
        role: iron.role,
        email: iron.email,
      };
    }
  }

  return {
    prisma,
    session,
    userId: session?.userId ?? null,
    req: req as Request,
    res: res as Response,
  };
}
