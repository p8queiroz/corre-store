import { Router } from "express";
import { authService } from "../services/auth.service.js";
import { authRateLimiter } from "../middleware/rate-limit.js";
import type { SessionData } from "@stride/shared";

export const authRouter = Router();

authRouter.use(authRateLimiter);

authRouter.post("/register", async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const user = await authService.login(req.body);
    const session = req.session as SessionData & { save: () => Promise<void> };
    session.userId = user.userId;
    session.email = user.email;
    session.role = user.role as SessionData["role"];
    await session.save();
    res.json({ user });
  } catch (e) {
    next(e);
  }
});

authRouter.post("/logout", async (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

authRouter.get("/me", async (req, res) => {
  const session = req.session as SessionData;
  if (!session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json({ user: session });
});

authRouter.post("/verify-email", async (req, res, next) => {
  try {
    const result = await authService.verifyEmail(req.body.token);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

authRouter.post("/forgot-password", async (req, res, next) => {
  try {
    const result = await authService.forgotPassword(req.body);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

authRouter.post("/reset-password", async (req, res, next) => {
  try {
    const result = await authService.resetPassword(req.body);
    res.json(result);
  } catch (e) {
    next(e);
  }
});
