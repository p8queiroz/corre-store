/**
 * Seed script — populates categories, demo users, and sample listings.
 * Run: npm run db:seed
 *
 * Admin accounts are NEVER created via public signup — only here or CLI.
 */
import { hash } from "bcryptjs";
import {
  ListingCondition,
  ListingStatus,
  ModerationDecision,
  PrismaClient,
  UserRole,
  UserStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash("Password123!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@stridemarket.local" },
    update: {},
    create: {
      email: "admin@stridemarket.local",
      name: "Platform Admin",
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
  });

  const sellerUser = await prisma.user.upsert({
    where: { email: "seller@stridemarket.local" },
    update: {},
    create: {
      email: "seller@stridemarket.local",
      name: "Ana Runner",
      passwordHash,
      role: UserRole.SELLER,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      sellerProfile: {
        create: {
          displayName: "Ana's Running Gear",
          bio: "Marathon finisher selling quality pre-loved gear.",
          city: "São Paulo",
          state: "SP",
          isVerified: true,
          approvedAt: new Date(),
        },
      },
    },
    include: { sellerProfile: true },
  });

  await prisma.user.upsert({
    where: { email: "buyer@stridemarket.local" },
    update: {},
    create: {
      email: "buyer@stridemarket.local",
      name: "Carlos Buyer",
      passwordHash,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
  });

  const categories = [
    { slug: "running-shoes", name: "Running Shoes", icon: "directions_run" },
    { slug: "hydration", name: "Hydration", icon: "water_drop" },
    { slug: "wearables", name: "Wearables", icon: "watch" },
    { slug: "apparel", name: "Sportswear", icon: "checkroom" },
    { slug: "accessories", name: "Accessories", icon: "fitness_center" },
  ];

  for (const [i, cat] of categories.entries()) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { ...cat, sortOrder: i, description: `${cat.name} for runners` },
    });
  }

  const shoes = await prisma.category.findUniqueOrThrow({
    where: { slug: "running-shoes" },
  });

  if (sellerUser.sellerProfile) {
    await prisma.listing.upsert({
      where: { slug: "nike-pegasus-40-marathon-beginner" },
      update: {},
      create: {
        sellerId: sellerUser.id,
        sellerProfileId: sellerUser.sellerProfile.id,
        categoryId: shoes.id,
        title: "Nike Pegasus 40 — Marathon Beginner Friendly",
        slug: "nike-pegasus-40-marathon-beginner",
        description:
          "Lightweight daily trainer, ~200km. Great cushion for beginners building mileage.",
        priceCents: 44900,
        condition: ListingCondition.GOOD,
        city: "São Paulo",
        state: "SP",
        tags: ["nike", "marathon", "beginner", "daily-trainer"],
        status: ListingStatus.ACTIVE,
        moderation: ModerationDecision.APPROVED,
        publishedAt: new Date(),
        featured: true,
        trendingScore: 95,
        images: {
          create: [
            {
              url: "/placeholders/shoe-1.jpg",
              thumbnailUrl: "/placeholders/shoe-1-thumb.jpg",
              sortOrder: 0,
            },
          ],
        },
      },
    });
  }

  await prisma.homepageBanner.createMany({
    data: [
      {
        title: "Gear up for your next marathon",
        subtitle: "Trusted running gear from verified sellers",
        imageUrl: "/placeholders/banner-hero.jpg",
        linkUrl: "/search?q=marathon",
        sortOrder: 0,
      },
    ],
    skipDuplicates: true,
  });

  console.log("Seed complete.");
  console.log("  Admin:", admin.email, "/ Password123!");
  console.log("  Seller:", sellerUser.email);
  console.log("  Buyer: buyer@stridemarket.local");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
