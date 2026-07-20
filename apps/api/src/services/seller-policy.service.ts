import type { SellerProfile } from "@stride/database";
import { StravaConnectionStatus, UserRole, UserStatus } from "@stride/database";

type PublishUser = {
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  whatsappConfirmedAt?: Date | null;
};

type PublishSellerProfile = Pick<
  SellerProfile,
  "stravaConnectionStatus" | "stravaVerifiedAt"
>;

export function canPublishListing(
  user: PublishUser,
  sellerProfile: PublishSellerProfile | null
): boolean {
  return (
    user.role === UserRole.SELLER &&
    user.status === UserStatus.ACTIVE &&
    Boolean(user.emailVerifiedAt) &&
    sellerProfile?.stravaConnectionStatus === StravaConnectionStatus.VERIFIED &&
    Boolean(sellerProfile.stravaVerifiedAt)
  );
}

export function sellerVerificationStatus(
  user: PublishUser,
  sellerProfile: PublishSellerProfile | null
) {
  const emailVerified = Boolean(user.emailVerifiedAt);
  const whatsappVerified = Boolean(user.whatsappConfirmedAt);
  const stravaVerified =
    sellerProfile?.stravaConnectionStatus === StravaConnectionStatus.VERIFIED &&
    Boolean(sellerProfile.stravaVerifiedAt);

  return {
    emailVerified,
    whatsappVerified,
    stravaConnectionStatus:
      sellerProfile?.stravaConnectionStatus ?? StravaConnectionStatus.NOT_CONNECTED,
    stravaVerified,
    stravaVerifiedAt: sellerProfile?.stravaVerifiedAt ?? null,
    badges: stravaVerified ? ["STRAVA_VERIFIED"] : [],
    canPublishListings: canPublishListing(user, sellerProfile),
  };
}
