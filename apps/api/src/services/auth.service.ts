import { createHash, randomBytes } from "node:crypto";
import { hash, compare } from "bcryptjs";
import { prisma, UserRole, UserStatus } from "@stride/database";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@stride/shared";
import type { z } from "zod";
import { AppError } from "../middleware/error-handler.js";
import { enqueueEmail } from "./queue.service.js";

const BCRYPT_ROUNDS = 12;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const authService = {
  async register(input: z.infer<typeof registerSchema>) {
    const data = registerSchema.parse(input);

    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (existing) {
      throw new AppError(409, "Email already registered", "EMAIL_EXISTS");
    }

    const passwordHash = await hash(data.password, BCRYPT_ROUNDS);
    const verifyToken = randomBytes(32).toString("hex");

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        name: data.name,
        passwordHash,
        role: data.asSeller ? UserRole.SELLER : UserRole.USER,
        status: UserStatus.PENDING_VERIFICATION,
        emailTokens: {
          create: {
            tokenHash: hashToken(verifyToken),
            type: "verify",
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        },
        ...(data.asSeller
          ? {
              sellerProfile: {
                create: {
                  displayName: data.name,
                  moderationNote: "Pending seller review",
                },
              },
            }
          : {}),
      },
    });

    await enqueueEmail({
      to: user.email,
      subject: "Verify your StrideMarket account",
      type: "VERIFY_EMAIL",
      htmlBody: `<p>Welcome! Verify: <a href="${process.env.WEB_ORIGIN}/verify-email?token=${verifyToken}">Click here</a></p>`,
    });

    await enqueueEmail({
      to: user.email,
      subject: "Welcome to StrideMarket",
      type: "WELCOME",
      htmlBody: `<p>Hi ${user.name}, welcome to the running gear marketplace.</p>`,
    });

    return { userId: user.id, email: user.email };
  },

  async login(input: z.infer<typeof loginSchema>) {
    const data = loginSchema.parse(input);
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (!user || !(await compare(data.password, user.passwordHash))) {
      throw new AppError(401, "Invalid credentials", "INVALID_CREDENTIALS");
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new AppError(403, "Account suspended", "SUSPENDED");
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };
  },

  async becomeSeller(userId: string) {
    const existing = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true, role: true },
    });

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        role: existing.role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.SELLER,
        sellerProfile: {
          upsert: {
            create: {
              displayName: existing.name,
              moderationNote: "Pending seller review",
            },
            update: {},
          },
        },
      },
      include: { sellerProfile: true },
    });

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };
  },

  async verifyEmail(token: string) {
    const tokenHash = hashToken(token);
    const record = await prisma.emailToken.findFirst({
      where: { tokenHash, type: "verify", usedAt: null },
      include: { user: true },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new AppError(400, "Invalid or expired token", "INVALID_TOKEN");
    }

    await prisma.$transaction([
      prisma.emailToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: record.userId },
        data: {
          emailVerifiedAt: new Date(),
          status: UserStatus.ACTIVE,
        },
      }),
    ]);

    return { success: true };
  },

  async forgotPassword(input: z.infer<typeof forgotPasswordSchema>) {
    const { email } = forgotPasswordSchema.parse(input);
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success — prevents email enumeration
    if (!user) return { success: true };

    const resetToken = randomBytes(32).toString("hex");
    await prisma.emailToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(resetToken),
        type: "reset",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await enqueueEmail({
      to: user.email,
      subject: "Reset your password",
      type: "FORGOT_PASSWORD",
      htmlBody: `<p>Reset: <a href="${process.env.WEB_ORIGIN}/reset-password?token=${resetToken}">Click here</a></p>`,
    });

    return { success: true };
  },

  async resetPassword(input: z.infer<typeof resetPasswordSchema>) {
    const data = resetPasswordSchema.parse(input);
    const tokenHash = hashToken(data.token);
    const record = await prisma.emailToken.findFirst({
      where: { tokenHash, type: "reset", usedAt: null },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new AppError(400, "Invalid or expired token", "INVALID_TOKEN");
    }

    const passwordHash = await hash(data.password, BCRYPT_ROUNDS);

    await prisma.$transaction([
      prisma.emailToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
    ]);

    return { success: true };
  },
};
