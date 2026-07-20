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
    update: {
      name: "Ana Runner",
      whatsappNumber: "5511999990000",
      whatsappConfirmedAt: new Date(),
      city: "São Paulo",
      state: "SP",
      bio: "Corredora amadora desapegando de equipamentos em bom estado.",
      instagramUrl: "https://instagram.com/anarunner",
      stravaUrl: "https://www.strava.com/athletes/anarunner",
      role: UserRole.SELLER,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      sellerProfile: {
        upsert: {
          create: {
            displayName: "Repasses da Ana",
            bio: "Produtos em bom estado prontos para uma nova rodada.",
            city: "São Paulo",
            state: "SP",
            isVerified: true,
            approvedAt: new Date(),
          },
          update: {
            displayName: "Repasses da Ana",
            bio: "Produtos em bom estado prontos para uma nova rodada.",
            city: "São Paulo",
            state: "SP",
            isVerified: true,
            approvedAt: new Date(),
          },
        },
      },
    },
    create: {
      email: "seller@stridemarket.local",
      name: "Ana Runner",
      whatsappNumber: "5511999990000",
      whatsappConfirmedAt: new Date(),
      city: "São Paulo",
      state: "SP",
      bio: "Corredora amadora desapegando de equipamentos em bom estado.",
      instagramUrl: "https://instagram.com/anarunner",
      stravaUrl: "https://www.strava.com/athletes/anarunner",
      passwordHash,
      role: UserRole.SELLER,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      sellerProfile: {
        create: {
          displayName: "Repasses da Ana",
          bio: "Produtos em bom estado prontos para uma nova rodada.",
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
    update: {
      name: "Carlos Comprador",
      city: "Fortaleza",
      state: "CE",
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
    create: {
      email: "buyer@stridemarket.local",
      name: "Carlos Comprador",
      city: "Fortaleza",
      state: "CE",
      passwordHash,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
  });

  const categories = [
    { slug: "running-shoes", name: "Calçados", icon: "directions_run" },
    { slug: "hydration", name: "Hidratação", icon: "water_drop" },
    { slug: "wearables", name: "Eletrônicos vestíveis", icon: "watch" },
    { slug: "apparel", name: "Vestuário", icon: "checkroom" },
    { slug: "accessories", name: "Acessórios", icon: "fitness_center" },
  ];

  for (const [i, cat] of categories.entries()) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon, sortOrder: i, description: `${cat.name} para uma nova rodada` },
      create: { ...cat, sortOrder: i, description: `${cat.name} para uma nova rodada` },
    });
  }

  const shoes = await prisma.category.findUniqueOrThrow({
    where: { slug: "running-shoes" },
  });

  if (sellerUser.sellerProfile) {
    await prisma.listing.upsert({
      where: { slug: "nike-pegasus-40-marathon-beginner" },
      update: {
        sellerId: sellerUser.id,
        sellerProfileId: sellerUser.sellerProfile.id,
        categoryId: shoes.id,
        status: ListingStatus.ACTIVE,
        moderation: ModerationDecision.APPROVED,
        moderationNote: null,
        publishedAt: new Date(),
        featured: true,
        trendingScore: 95,
      },
      create: {
        sellerId: sellerUser.id,
        sellerProfileId: sellerUser.sellerProfile.id,
        categoryId: shoes.id,
        title: "Nike Pegasus 40 em bom estado",
        slug: "nike-pegasus-40-marathon-beginner",
        description:
          "Tênis leve, com cerca de 200km de uso. Boa opção para quem quer começar sem comprar novo.",
        priceCents: 44900,
        condition: ListingCondition.GOOD,
        city: "São Paulo",
        state: "SP",
        tags: ["nike", "corrida", "iniciante", "seminovo"],
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

  const bannerData = {
    title: "Venda o que não usa mais",
    subtitle: "Transforme itens parados em novas possibilidades",
    imageUrl: "/placeholders/banner-hero.jpg",
    linkUrl: "/search",
    sortOrder: 0,
    active: true,
  };

  const existingBanner = await prisma.homepageBanner.findFirst({
    where: { sortOrder: 0 },
    orderBy: { createdAt: "asc" },
  });

  if (existingBanner) {
    await prisma.homepageBanner.update({
      where: { id: existingBanner.id },
      data: bannerData,
    });
  } else {
    await prisma.homepageBanner.create({
      data: bannerData,
    });
  }

  await prisma.homepageBanner.updateMany({
    where: {
      OR: [
        { title: "Gear up for your next marathon" },
        { subtitle: "Trusted running gear from verified sellers" },
      ],
    },
    data: bannerData,
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
