import { prisma, StravaConnectionStatus, UserRole } from "@stride/database";
import { env } from "../config/env.js";
import { AppError } from "../middleware/error-handler.js";
import { sellerVerificationStatus } from "./seller-policy.service.js";

type StravaTokenResponse = {
  access_token?: string;
  athlete?: {
    id?: number;
    username?: string | null;
    firstname?: string | null;
    lastname?: string | null;
  };
};

function requireStravaConfig() {
  if (!env.STRAVA_CLIENT_ID || !env.STRAVA_CLIENT_SECRET || !env.STRAVA_REDIRECT_URI) {
    throw new AppError(
      503,
      "Strava connection is not configured",
      "STRAVA_NOT_CONFIGURED"
    );
  }

  return {
    clientId: env.STRAVA_CLIENT_ID,
    clientSecret: env.STRAVA_CLIENT_SECRET,
    redirectUri: env.STRAVA_REDIRECT_URI,
  };
}

function displayName(athlete: NonNullable<StravaTokenResponse["athlete"]>) {
  const fullName = [athlete.firstname, athlete.lastname]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

  return fullName || athlete.username || `Strava athlete ${athlete.id}`;
}

export const stravaService = {
  async assertSellerCanConnect(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { sellerProfile: true },
    });

    if (!user) {
      throw new AppError(401, "Authentication required", "UNAUTHORIZED");
    }
    if (user.role !== UserRole.SELLER && user.role !== UserRole.ADMIN) {
      throw new AppError(403, "Enable seller tools before connecting Strava", "SELLER_REQUIRED");
    }
    if (!user.sellerProfile) {
      throw new AppError(400, "Seller profile is required", "SELLER_PROFILE_REQUIRED");
    }
  },

  authorizationUrl(state: string) {
    const config = requireStravaConfig();
    const url = new URL("https://www.strava.com/oauth/authorize");
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", config.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("approval_prompt", "auto");
    url.searchParams.set("scope", "read");
    url.searchParams.set("state", state);
    return url.toString();
  },

  async completeConnection(input: {
    userId: string;
    code: string;
    grantedScope?: string;
  }) {
    const config = requireStravaConfig();
    const params = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: input.code,
      grant_type: "authorization_code",
    });

    const response = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: params,
    });

    if (!response.ok) {
      await this.markConnectionError(input.userId);
      throw new AppError(502, "Strava authorization failed", "STRAVA_TOKEN_EXCHANGE_FAILED");
    }

    const body = (await response.json()) as StravaTokenResponse;
    const athleteId = body.athlete?.id ? String(body.athlete.id) : null;

    if (!athleteId) {
      await this.markConnectionError(input.userId);
      throw new AppError(502, "Strava did not return an athlete ID", "STRAVA_ATHLETE_ID_MISSING");
    }

    const duplicate = await prisma.sellerProfile.findFirst({
      where: {
        stravaAthleteId: athleteId,
        userId: { not: input.userId },
      },
      select: { id: true },
    });

    if (duplicate) {
      await this.markConnectionError(input.userId);
      throw new AppError(
        409,
        "This Strava account is already connected to another seller",
        "STRAVA_ACCOUNT_ALREADY_LINKED"
      );
    }

    return prisma.sellerProfile.update({
      where: { userId: input.userId },
      data: {
        stravaAthleteId: athleteId,
        stravaDisplayName: displayName(body.athlete ?? { id: Number(athleteId) }),
        stravaProfileUrl: `https://www.strava.com/athletes/${athleteId}`,
        stravaVerifiedAt: new Date(),
        stravaScopes: input.grantedScope
          ? input.grantedScope.split(",").map((scope) => scope.trim()).filter(Boolean)
          : ["read"],
        stravaConnectionStatus: StravaConnectionStatus.VERIFIED,
      },
    });
  },

  async markConnectionError(userId: string) {
    await prisma.sellerProfile.updateMany({
      where: { userId },
      data: { stravaConnectionStatus: StravaConnectionStatus.ERROR },
    });
  },

  async disconnect(userId: string) {
    await prisma.sellerProfile.updateMany({
      where: { userId },
      data: {
        stravaAthleteId: null,
        stravaDisplayName: null,
        stravaProfileUrl: null,
        stravaVerifiedAt: null,
        stravaScopes: [],
        stravaConnectionStatus: StravaConnectionStatus.DISCONNECTED,
      },
    });

    return { success: true };
  },

  async verificationStatus(userId: string) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        role: true,
        status: true,
        emailVerifiedAt: true,
        whatsappConfirmedAt: true,
        sellerProfile: {
          select: {
            stravaConnectionStatus: true,
            stravaVerifiedAt: true,
            stravaDisplayName: true,
            stravaProfileUrl: true,
          },
        },
      },
    });

    return {
      ...sellerVerificationStatus(user, user.sellerProfile),
      stravaDisplayName: user.sellerProfile?.stravaDisplayName ?? null,
      stravaProfileUrl: user.sellerProfile?.stravaProfileUrl ?? null,
    };
  },
};
