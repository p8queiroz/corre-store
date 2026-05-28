import { Router } from "express";
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
  limits: { fileSize: MAX_SIZE, files: 8 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      cb(new Error("Invalid file type"));
      return;
    }
    cb(null, true);
  },
});

export const uploadRouter = Router();

uploadRouter.post(
  "/listing-images",
  async (req, res, next) => {
    try {
      const ctx = await createContext({ req, res });
      requireAuth(ctx);
      next();
    } catch (e) {
      next(e);
    }
  },
  upload.array("images", 8),
  async (req, res, next) => {
    try {
      const files = req.files as Express.Multer.File[];
      const urls = files.map((f) => `/uploads/${f.filename}`);

      for (const file of files) {
        await enqueueJob(JOB_QUEUES.IMAGE_PROCESSING, {
          path: file.path,
          filename: file.filename,
        });
      }

      res.json({ urls });
    } catch (e) {
      next(e);
    }
  }
);
