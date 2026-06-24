import { ListingStatus, ModerationDecision, prisma } from "@stride/database";
import { contactSellerSchema, reportSchema, type ContactSellerInput, type ReportInput } from "@stride/shared";
import { AppError } from "../middleware/error-handler.js";

function normalizeWhatsAppNumber(value: string | null | undefined) {
  return (value ?? "").replace(/[^\d]/g, "");
}

function buildWhatsAppDeepLink(phoneNumber: string, message: string) {
  const normalized = normalizeWhatsAppNumber(phoneNumber);
  if (!normalized) return null;

  // MVP path: wa.me opens WhatsApp with a prefilled message and needs no paid API setup.
  // Future path: WhatsApp Business API would send template/session messages server-side,
  // requiring Meta app configuration, approved templates, billing, and webhook handling.
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export const contactService = {
  async contactSeller(buyerId: string, raw: ContactSellerInput) {
    const input = contactSellerSchema.parse(raw);
    const listing = await prisma.listing.findUnique({
      where: { id: input.listingId },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            whatsappNumber: true,
            whatsappConfirmedAt: true,
            status: true,
          },
        },
        sellerProfile: true,
      },
    });

    if (!listing) {
      throw new AppError(404, "Listing not found", "NOT_FOUND");
    }
    if (listing.status !== ListingStatus.ACTIVE || listing.moderation !== ModerationDecision.APPROVED) {
      throw new AppError(400, "Only active approved listings can be contacted", "LISTING_NOT_CONTACTABLE");
    }
    if (listing.sellerId === buyerId) {
      throw new AppError(400, "You cannot contact yourself about your own listing", "SELF_CONTACT");
    }
    if (!listing.sellerProfileId) {
      throw new AppError(400, "Seller profile is not ready for contact", "SELLER_PROFILE_MISSING");
    }
    if (!listing.seller.whatsappNumber) {
      throw new AppError(400, "Seller has not added WhatsApp contact yet", "WHATSAPP_MISSING");
    }

    const listingUrl = input.listingUrl ?? `https://stridemarket.local/listings/${listing.slug}`;
    const message = `Hi, I saw your listing on StrideMarket: ${listing.title} - ${listingUrl}. Is it still available?`;
    const contactUrl = buildWhatsAppDeepLink(listing.seller.whatsappNumber, message);
    if (!contactUrl) {
      throw new AppError(400, "Seller WhatsApp number is invalid", "WHATSAPP_INVALID");
    }

    const inquiry = await prisma.inquiry.create({
      data: {
        buyerId,
        sellerId: listing.sellerId,
        sellerProfileId: listing.sellerProfileId,
        listingId: listing.id,
        contactMethod: "WHATSAPP",
        message,
        contactUrl,
      },
    });

    return {
      inquiryId: inquiry.id,
      contactUrl,
      message,
      seller: {
        id: listing.seller.id,
        name: listing.seller.name,
        whatsappConfirmed: Boolean(listing.seller.whatsappConfirmedAt),
      },
    };
  },

  async myInquiries(userId: string) {
    return prisma.inquiry.findMany({
      where: { buyerId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        listing: {
          include: {
            images: { orderBy: { sortOrder: "asc" }, take: 1 },
            category: true,
            seller: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });
  },

  async report(userId: string, raw: ReportInput) {
    const input = reportSchema.parse(raw);
    const listing = input.listingId
      ? await prisma.listing.findUnique({
          where: { id: input.listingId },
          select: { id: true, sellerId: true },
        })
      : null;
    const sellerId = input.sellerId ?? listing?.sellerId;

    if (input.listingId && !listing) {
      throw new AppError(404, "Listing not found", "NOT_FOUND");
    }
    if (sellerId === userId) {
      throw new AppError(400, "You cannot report yourself", "SELF_REPORT");
    }

    return prisma.report.create({
      data: {
        reporterId: userId,
        listingId: input.listingId,
        sellerId,
        reason: input.reason,
        details: input.details || null,
      },
    });
  },
};
