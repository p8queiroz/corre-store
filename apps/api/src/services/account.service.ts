import { compare, hash } from "bcryptjs";
import { ListingStatus, prisma, UserRole, UserStatus } from "@stride/database";
import {
  avatarSchema,
  changePasswordSchema,
  profileSchema,
  type ProfileInput,
} from "@stride/shared";
import { AppError } from "../middleware/error-handler.js";

const BCRYPT_ROUNDS = 12;

function emptyToNull(value: string | undefined | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export const accountService = {
  async me(userId: string) {
    return prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerifiedAt: true,
        name: true,
        avatarUrl: true,
        whatsappNumber: true,
        whatsappConfirmedAt: true,
        city: true,
        state: true,
        bio: true,
        instagramUrl: true,
        stravaUrl: true,
        websiteUrl: true,
        role: true,
        status: true,
        deactivatedAt: true,
        createdAt: true,
        sellerProfile: true,
      },
    });
  },

  async updateProfile(userId: string, raw: ProfileInput) {
    const input = profileSchema.parse(raw);
    const existing = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { whatsappNumber: true, role: true },
    });

    const nextWhatsapp = emptyToNull(input.whatsappNumber);
    const whatsappChanged = nextWhatsapp !== existing.whatsappNumber;

    return prisma.user.update({
      where: { id: userId },
      data: {
        name: input.name,
        whatsappNumber: nextWhatsapp,
        whatsappConfirmedAt: nextWhatsapp
          ? whatsappChanged
            ? new Date()
            : undefined
          : null,
        city: emptyToNull(input.city),
        state: emptyToNull(input.state),
        bio: emptyToNull(input.bio),
        instagramUrl: emptyToNull(input.instagramUrl),
        stravaUrl: emptyToNull(input.stravaUrl),
        websiteUrl: emptyToNull(input.websiteUrl),
        sellerProfile:
          existing.role === UserRole.SELLER || existing.role === UserRole.ADMIN
            ? {
                update: {
                  displayName: input.name,
                  bio: emptyToNull(input.bio),
                  city: emptyToNull(input.city),
                  state: emptyToNull(input.state),
                },
              }
            : undefined,
      },
      include: { sellerProfile: true },
    });
  },

  async updateAvatar(userId: string, raw: unknown) {
    const { avatarUrl } = avatarSchema.parse(raw);
    return prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: { id: true, avatarUrl: true },
    });
  },

  async changePassword(userId: string, raw: unknown) {
    const input = changePasswordSchema.parse(raw);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const valid = await compare(input.currentPassword, user.passwordHash);
    if (!valid) {
      throw new AppError(400, "Current password is incorrect", "INVALID_PASSWORD");
    }

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hash(input.newPassword, BCRYPT_ROUNDS) },
    });

    return { success: true };
  },

  async deactivate(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.SUSPENDED,
        deactivatedAt: new Date(),
        listings: {
          updateMany: {
            where: {
              sellerId: userId,
              status: {
                in: [ListingStatus.ACTIVE, ListingStatus.PENDING_REVIEW, ListingStatus.DRAFT],
              },
            },
            data: { status: ListingStatus.REMOVED },
          },
        },
      },
    });

    return { success: true };
  },
};
