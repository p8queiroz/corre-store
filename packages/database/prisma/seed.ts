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
  const hydration = await prisma.category.findUniqueOrThrow({
    where: { slug: "hydration" },
  });
  const wearables = await prisma.category.findUniqueOrThrow({
    where: { slug: "wearables" },
  });

  /** Compact demo vectors so "Itens semelhantes" works without OPENAI_API_KEY. */
  function demoEmbedding(categorySlot: number, variant: number): number[] {
    const dim = 32;
    const vector = Array.from({ length: dim }, (_, i) => {
      if (i === categorySlot) return 1;
      if (i === (categorySlot + 1) % dim) return 0.35 + variant * 0.08;
      return Math.sin((variant + 1) * (i + 1) * 0.13) * 0.08;
    });
    const norm = Math.hypot(...vector) || 1;
    return vector.map((value) => value / norm);
  }

  if (sellerUser.sellerProfile) {
    const sampleListings = [
      {
        slug: "nike-pegasus-40-marathon-beginner",
        categoryId: shoes.id,
        title: "Nike Pegasus 40 em bom estado",
        description:
          "Tênis leve, com cerca de 200km de uso. Boa opção para quem quer começar sem comprar novo.",
        priceCents: 44900,
        condition: ListingCondition.GOOD,
        tags: ["nike", "corrida", "iniciante", "seminovo"],
        featured: true,
        trendingScore: 95,
        image: "/placeholders/shoe-1.jpg",
        thumb: "/placeholders/shoe-1-thumb.jpg",
        embedding: demoEmbedding(0, 0),
      },
      {
        slug: "asics-gel-nimbus-25-leve",
        categoryId: shoes.id,
        title: "Asics Gel-Nimbus 25 leve",
        description:
          "Amortecimento macio para treinos longos. Pouco uso, ideal para quem busca conforto sem comprar novo.",
        priceCents: 52000,
        condition: ListingCondition.LIKE_NEW,
        tags: ["asics", "corrida", "amortecimento", "seminovo"],
        featured: true,
        trendingScore: 88,
        image: "/placeholders/shoe-1.jpg",
        thumb: "/placeholders/shoe-1-thumb.jpg",
        embedding: demoEmbedding(0, 1),
      },
      {
        slug: "garrafa-hidratacao-soft-flask",
        categoryId: hydration.id,
        title: "Soft flask de hidratação 500ml",
        description:
          "Garrafa flexível para colete ou cinto. Quase nova, pronta para a próxima prova.",
        priceCents: 8900,
        condition: ListingCondition.LIKE_NEW,
        tags: ["hidratacao", "garrafa", "trail"],
        featured: false,
        trendingScore: 70,
        image: "/placeholders/shoe-1.jpg",
        thumb: "/placeholders/shoe-1-thumb.jpg",
        embedding: demoEmbedding(1, 0),
      },
      {
        slug: "garmin-forerunner-255",
        categoryId: wearables.id,
        title: "Garmin Forerunner 255",
        description:
          "Relógio com GPS e métricas de corrida. Vendido porque migrei para outro modelo.",
        priceCents: 129000,
        condition: ListingCondition.GOOD,
        tags: ["garmin", "relogio", "gps"],
        featured: true,
        trendingScore: 82,
        image: "/placeholders/shoe-1.jpg",
        thumb: "/placeholders/shoe-1-thumb.jpg",
        embedding: demoEmbedding(2, 0),
      },
    ] as const;

    for (const sample of sampleListings) {
      await prisma.listing.upsert({
        where: { slug: sample.slug },
        update: {
          sellerId: sellerUser.id,
          sellerProfileId: sellerUser.sellerProfile.id,
          categoryId: sample.categoryId,
          title: sample.title,
          description: sample.description,
          priceCents: sample.priceCents,
          condition: sample.condition,
          tags: [...sample.tags],
          status: ListingStatus.ACTIVE,
          moderation: ModerationDecision.APPROVED,
          moderationNote: null,
          publishedAt: new Date(),
          featured: sample.featured,
          trendingScore: sample.trendingScore,
          embedding: [...sample.embedding],
          aiSummary: sample.description.slice(0, 200),
        },
        create: {
          sellerId: sellerUser.id,
          sellerProfileId: sellerUser.sellerProfile.id,
          categoryId: sample.categoryId,
          title: sample.title,
          slug: sample.slug,
          description: sample.description,
          priceCents: sample.priceCents,
          condition: sample.condition,
          city: "São Paulo",
          state: "SP",
          tags: [...sample.tags],
          status: ListingStatus.ACTIVE,
          moderation: ModerationDecision.APPROVED,
          publishedAt: new Date(),
          featured: sample.featured,
          trendingScore: sample.trendingScore,
          embedding: [...sample.embedding],
          aiSummary: sample.description.slice(0, 200),
          images: {
            create: [
              {
                url: sample.image,
                thumbnailUrl: sample.thumb,
                sortOrder: 0,
              },
            ],
          },
        },
      });
    }
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
