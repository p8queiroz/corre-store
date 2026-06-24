import { Router } from "express";
import type { Request, Response } from "express";
import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/require-auth.js";
import { createContext } from "../context.js";
import { enqueueJob } from "../services/queue.service.js";
import { JOB_QUEUES } from "@stride/shared";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;
const MAX_IMAGES = 8;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, env.STORAGE_LOCAL_PATH);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE, files: MAX_IMAGES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      cb(new Error("Invalid file type"));
      return;
    }
    cb(null, true);
  },
});

export const uploadRouter = Router();

async function requireSession(req: Request, res: Response) {
  const ctx = await createContext({ req, res });
  requireAuth(ctx);
  return ctx;
}

uploadRouter.post(
  "/listing-images",
  async (req, res, next) => {
    try {
      await requireSession(req, res);
      next();
    } catch (e) {
      next(e);
    }
  },
  upload.array("images", MAX_IMAGES),
  async (req, res, next) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files.length) {
        res.status(400).json({ error: "Send at least one image." });
        return;
      }
      const urls = files.map((f) => `/uploads/${f.filename}`);
      const metadata = files.map((file) => ({
        url: `/uploads/${file.filename}`,
        mimeType: file.mimetype,
        fileSizeBytes: file.size,
        qualityFlags: file.size === 0 ? ["empty-file"] : [],
      }));

      for (const file of files) {
        await enqueueJob(JOB_QUEUES.IMAGE_PROCESSING, {
          path: file.path,
          filename: file.filename,
          mimeType: file.mimetype,
          fileSizeBytes: file.size,
        });
      }

      res.json({ urls, metadata });
    } catch (e) {
      next(e);
    }
  }
);

uploadRouter.post(
  "/avatar",
  async (req, res, next) => {
    try {
      await requireSession(req, res);
      next();
    } catch (e) {
      next(e);
    }
  },
  upload.single("avatar"),
  async (req, res, next) => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "Send an avatar image." });
        return;
      }
      res.json({
        url: `/uploads/${file.filename}`,
        metadata: {
          mimeType: file.mimetype,
          fileSizeBytes: file.size,
        },
      });
    } catch (e) {
      next(e);
    }
  }
);
