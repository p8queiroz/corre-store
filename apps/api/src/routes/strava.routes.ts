import { randomBytes, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import type { SessionData } from "@stride/shared";
import { env } from "../config/env.js";
import { stravaService } from "../services/strava.service.js";

type WritableSession = SessionData & { save: () => Promise<void> };

const STATE_TTL_MS = 10 * 60 * 1000;

export const stravaRouter = Router();

function redirectUrl(status: "connected" | "denied" | "error", code?: string) {
  const url = new URL("/sell", env.WEB_ORIGIN);
  url.searchParams.set("strava", status);
  if (code) url.searchParams.set("code", code);
  return url.toString();
}

function safeStateEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

stravaRouter.get("/connect", async (req, res, next) => {
  try {
    const session = req.session as WritableSession;
    if (!session?.userId) {
      res.status(401).json({ error: "Not authenticated", code: "UNAUTHORIZED" });
      return;
    }

    await stravaService.assertSellerCanConnect(session.userId);

    const state = randomBytes(32).toString("hex");
    session.stravaOAuthState = {
      value: state,
      userId: session.userId,
      expiresAt: Date.now() + STATE_TTL_MS,
    };
    await session.save();

    res.redirect(stravaService.authorizationUrl(state));
  } catch (error) {
    next(error);
  }
});

stravaRouter.get("/callback", async (req, res) => {
  const session = req.session as WritableSession;
  const storedState = session.stravaOAuthState;
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const grantedScope = typeof req.query.scope === "string" ? req.query.scope : undefined;
  const denied = typeof req.query.error === "string";

  delete session.stravaOAuthState;
  await session.save();

  if (
    !storedState ||
    !session.userId ||
    storedState.userId !== session.userId ||
    storedState.expiresAt < Date.now() ||
    !state ||
    !safeStateEqual(state, storedState.value)
  ) {
    res.redirect(redirectUrl("error", "STRAVA_INVALID_STATE"));
    return;
  }

  if (denied) {
    await stravaService.markConnectionError(session.userId);
    res.redirect(redirectUrl("denied", "STRAVA_AUTH_DENIED"));
    return;
  }

  if (!code) {
    await stravaService.markConnectionError(session.userId);
    res.redirect(redirectUrl("error", "STRAVA_CODE_MISSING"));
    return;
  }

  try {
    await stravaService.completeConnection({
      userId: session.userId,
      code,
      grantedScope,
    });
    res.redirect(redirectUrl("connected"));
  } catch (error) {
    res.redirect(
      redirectUrl(
        "error",
        error instanceof Error && "code" in error
          ? String((error as { code?: string }).code)
          : "STRAVA_CONNECTION_FAILED"
      )
    );
  }
});

stravaRouter.post("/disconnect", async (req, res, next) => {
  try {
    const session = req.session as SessionData;
    if (!session?.userId) {
      res.status(401).json({ error: "Not authenticated", code: "UNAUTHORIZED" });
      return;
    }

    const result = await stravaService.disconnect(session.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});
