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
  StravaConnectionStatus,
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
            stravaAthleteId: "demo-ana-runner",
            stravaDisplayName: "Ana Runner",
            stravaProfileUrl: "https://www.strava.com/athletes/demo-ana-runner",
            stravaVerifiedAt: new Date(),
            stravaScopes: ["read"],
            stravaConnectionStatus: StravaConnectionStatus.VERIFIED,
          },
          update: {
            displayName: "Repasses da Ana",
            bio: "Produtos em bom estado prontos para uma nova rodada.",
            city: "São Paulo",
            state: "SP",
            isVerified: true,
            approvedAt: new Date(),
            stravaAthleteId: "demo-ana-runner",
            stravaDisplayName: "Ana Runner",
            stravaProfileUrl: "https://www.strava.com/athletes/demo-ana-runner",
            stravaVerifiedAt: new Date(),
            stravaScopes: ["read"],
            stravaConnectionStatus: StravaConnectionStatus.VERIFIED,
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
          stravaAthleteId: "demo-ana-runner",
          stravaDisplayName: "Ana Runner",
          stravaProfileUrl: "https://www.strava.com/athletes/demo-ana-runner",
          stravaVerifiedAt: new Date(),
          stravaScopes: ["read"],
          stravaConnectionStatus: StravaConnectionStatus.VERIFIED,
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
  const apparel = await prisma.category.findUniqueOrThrow({
    where: { slug: "apparel" },
  });
  const accessories = await prisma.category.findUniqueOrThrow({
    where: { slug: "accessories" },
  });

  const categoryBySlug = {
    "running-shoes": shoes,
    hydration,
    wearables,
    apparel,
    accessories,
  } as const;

  const categorySlot: Record<keyof typeof categoryBySlug, number> = {
    "running-shoes": 0,
    hydration: 1,
    wearables: 2,
    apparel: 3,
    accessories: 4,
  };

  /** Compact demo vectors so "Itens semelhantes" works without OPENAI_API_KEY. */
  function demoEmbedding(slot: number, variant: number): number[] {
    const dim = 32;
    const vector = Array.from({ length: dim }, (_, i) => {
      if (i === slot) return 1;
      if (i === (slot + 1) % dim) return 0.35 + (variant % 10) * 0.08;
      return Math.sin((variant + 1) * (i + 1) * 0.13) * 0.08;
    });
    const norm = Math.hypot(...vector) || 1;
    return vector.map((value) => value / norm);
  }

  const cities = [
    { city: "São Paulo", state: "SP" },
    { city: "Rio de Janeiro", state: "RJ" },
    { city: "Belo Horizonte", state: "MG" },
    { city: "Curitiba", state: "PR" },
    { city: "Porto Alegre", state: "RS" },
    { city: "Brasília", state: "DF" },
    { city: "Florianópolis", state: "SC" },
    { city: "Fortaleza", state: "CE" },
    { city: "Salvador", state: "BA" },
    { city: "Recife", state: "PE" },
  ] as const;

  const conditions = [
    ListingCondition.NEW,
    ListingCondition.LIKE_NEW,
    ListingCondition.GOOD,
    ListingCondition.FAIR,
  ] as const;

  type CatalogItem = {
    categorySlug: keyof typeof categoryBySlug;
    brand: string;
    product: string;
    blurb: string;
    tags: string[];
    minPriceCents: number;
    maxPriceCents: number;
  };

  const catalog: CatalogItem[] = [
    {
      categorySlug: "running-shoes",
      brand: "Nike",
      product: "Pegasus 41",
      blurb: "Tênis versátil para treinos diários e longões leves.",
      tags: ["nike", "tenis", "treino"],
      minPriceCents: 32000,
      maxPriceCents: 58000,
    },
    {
      categorySlug: "running-shoes",
      brand: "Nike",
      product: "Invincible 3",
      blurb: "Muito amortecimento para recuperação e volume alto.",
      tags: ["nike", "amortecimento", "recuperacao"],
      minPriceCents: 45000,
      maxPriceCents: 72000,
    },
    {
      categorySlug: "running-shoes",
      brand: "Adidas",
      product: "Adizero Boston 12",
      blurb: "Tempero rápido para séries e ritmos de prova.",
      tags: ["adidas", "rapido", "prova"],
      minPriceCents: 38000,
      maxPriceCents: 65000,
    },
    {
      categorySlug: "running-shoes",
      brand: "Adidas",
      product: "Ultraboost Light",
      blurb: "Conforto macio para corridas longas e aquecimento.",
      tags: ["adidas", "conforto", "longo"],
      minPriceCents: 40000,
      maxPriceCents: 68000,
    },
    {
      categorySlug: "running-shoes",
      brand: "Asics",
      product: "Gel-Nimbus 26",
      blurb: "Amortecimento macio, ideal para quem prioriza proteção.",
      tags: ["asics", "nimbus", "amortecimento"],
      minPriceCents: 42000,
      maxPriceCents: 70000,
    },
    {
      categorySlug: "running-shoes",
      brand: "Asics",
      product: "Magic Speed 3",
      blurb: "Placa e responsividade para treinos de ritmo.",
      tags: ["asics", "placa", "ritmo"],
      minPriceCents: 48000,
      maxPriceCents: 78000,
    },
    {
      categorySlug: "running-shoes",
      brand: "Hoka",
      product: "Clifton 9",
      blurb: "Leve e estável para quilometragem semanal alta.",
      tags: ["hoka", "clifton", "leve"],
      minPriceCents: 45000,
      maxPriceCents: 75000,
    },
    {
      categorySlug: "running-shoes",
      brand: "Hoka",
      product: "Bondi 8",
      blurb: "Máximo cushioning para quem sente impacto nas articulações.",
      tags: ["hoka", "bondi", "cushion"],
      minPriceCents: 50000,
      maxPriceCents: 82000,
    },
    {
      categorySlug: "running-shoes",
      brand: "Saucony",
      product: "Endorphin Speed 3",
      blurb: "Nylon plate para fartleks e provas de 10k–21k.",
      tags: ["saucony", "speed", "placa"],
      minPriceCents: 47000,
      maxPriceCents: 76000,
    },
    {
      categorySlug: "running-shoes",
      brand: "New Balance",
      product: "Fresh Foam X 1080 v13",
      blurb: "Dia a dia macio, bom para quem corre em asfalto.",
      tags: ["newbalance", "1080", "asfalto"],
      minPriceCents: 43000,
      maxPriceCents: 71000,
    },
    {
      categorySlug: "hydration",
      brand: "Salomon",
      product: "Soft Flask 500ml",
      blurb: "Garrafa flexível para colete ou cinto de hidratação.",
      tags: ["salomon", "garrafa", "hidratacao"],
      minPriceCents: 6000,
      maxPriceCents: 14000,
    },
    {
      categorySlug: "hydration",
      brand: "CamelBak",
      product: "Quick Grip Chill",
      blurb: "Squeeze com isolamento para treinos de verão.",
      tags: ["camelbak", "squeeze", "verao"],
      minPriceCents: 8000,
      maxPriceCents: 16000,
    },
    {
      categorySlug: "hydration",
      brand: "Nathan",
      product: "VaporAiress 7L",
      blurb: "Colete leve com bolsos para gel e soft flasks.",
      tags: ["nathan", "colete", "trail"],
      minPriceCents: 28000,
      maxPriceCents: 52000,
    },
    {
      categorySlug: "hydration",
      brand: "Ultimate Direction",
      product: "Race Vest 6.0",
      blurb: "Colete de prova estável, ótimo para longões e trail.",
      tags: ["ud", "colete", "prova"],
      minPriceCents: 32000,
      maxPriceCents: 58000,
    },
    {
      categorySlug: "hydration",
      brand: "HydraPak",
      product: "Seeker 2L",
      blurb: "Reservatório para treinos longos e ultramaratonas.",
      tags: ["hydrapak", "reservatorio", "ultra"],
      minPriceCents: 12000,
      maxPriceCents: 24000,
    },
    {
      categorySlug: "hydration",
      brand: "Decathlon",
      product: "Cinto de hidratação Kalenji",
      blurb: "Cinto simples com espaço para duas garrafas pequenas.",
      tags: ["kalenji", "cinto", "barato"],
      minPriceCents: 5000,
      maxPriceCents: 12000,
    },
    {
      categorySlug: "wearables",
      brand: "Garmin",
      product: "Forerunner 265",
      blurb: "GPS com métricas de corrida e tela AMOLED.",
      tags: ["garmin", "relogio", "gps"],
      minPriceCents: 180000,
      maxPriceCents: 260000,
    },
    {
      categorySlug: "wearables",
      brand: "Garmin",
      product: "Forerunner 165",
      blurb: "Entrada acessível ao ecossistema Garmin para corredores.",
      tags: ["garmin", "iniciante", "gps"],
      minPriceCents: 120000,
      maxPriceCents: 180000,
    },
    {
      categorySlug: "wearables",
      brand: "Coros",
      product: "Pace 3",
      blurb: "Leve, bateria longa e mapas básicos para treino.",
      tags: ["coros", "pace", "bateria"],
      minPriceCents: 110000,
      maxPriceCents: 170000,
    },
    {
      categorySlug: "wearables",
      brand: "Polar",
      product: "Vantage M3",
      blurb: "Monitoramento de treino e recuperação para amadores.",
      tags: ["polar", "frequencia", "treino"],
      minPriceCents: 140000,
      maxPriceCents: 210000,
    },
    {
      categorySlug: "wearables",
      brand: "Garmin",
      product: "HRM-Pro Plus",
      blurb: "Cinta peitoral com dinâmica de corrida e precisão.",
      tags: ["garmin", "cinta", "hr"],
      minPriceCents: 45000,
      maxPriceCents: 75000,
    },
    {
      categorySlug: "wearables",
      brand: "Amazfit",
      product: "Cheetah",
      blurb: "Smartwatch esportivo com GPS dual-band e bom custo.",
      tags: ["amazfit", "smartwatch", "gps"],
      minPriceCents: 70000,
      maxPriceCents: 120000,
    },
    {
      categorySlug: "apparel",
      brand: "Nike",
      product: "Camiseta Dri-FIT",
      blurb: "Tecido leve que seca rápido em treinos quentes.",
      tags: ["nike", "camiseta", "dri-fit"],
      minPriceCents: 6000,
      maxPriceCents: 16000,
    },
    {
      categorySlug: "apparel",
      brand: "Adidas",
      product: "Short Own The Run",
      blurb: "Short com bolso traseiro para chave ou gel.",
      tags: ["adidas", "short", "treino"],
      minPriceCents: 7000,
      maxPriceCents: 18000,
    },
    {
      categorySlug: "apparel",
      brand: "Under Armour",
      product: "Legging HeatGear",
      blurb: "Compressão leve para ritmo e conforto no asfalto.",
      tags: ["ua", "legging", "compressao"],
      minPriceCents: 9000,
      maxPriceCents: 22000,
    },
    {
      categorySlug: "apparel",
      brand: "Decathlon",
      product: "Jaqueta corta-vento Run Warm",
      blurb: "Proteção contra vento em manhãs frias de longão.",
      tags: ["kalenji", "jaqueta", "inverno"],
      minPriceCents: 12000,
      maxPriceCents: 28000,
    },
    {
      categorySlug: "apparel",
      brand: "Compressport",
      product: "Meia Trail V4",
      blurb: "Meia técnica com suporte e boa durabilidade.",
      tags: ["compressport", "meia", "trail"],
      minPriceCents: 8000,
      maxPriceCents: 16000,
    },
    {
      categorySlug: "apparel",
      brand: "Buff",
      product: "Bandana CoolNet UV",
      blurb: "Proteção solar e suor sob controle em provas longas.",
      tags: ["buff", "bandana", "sol"],
      minPriceCents: 5000,
      maxPriceCents: 12000,
    },
    {
      categorySlug: "apparel",
      brand: "Lupo",
      product: "Top esportivo corrida",
      blurb: "Sustentação média para treinos e provas de rua.",
      tags: ["lupo", "top", "feminino"],
      minPriceCents: 6000,
      maxPriceCents: 15000,
    },
    {
      categorySlug: "apparel",
      brand: "Mizuno",
      product: "Bermuda Run Dry",
      blurb: "Bermuda leve com forro e bolso interno.",
      tags: ["mizuno", "bermuda", "leve"],
      minPriceCents: 8000,
      maxPriceCents: 19000,
    },
    {
      categorySlug: "accessories",
      brand: "Black Diamond",
      product: "Lanterna Storm 500",
      blurb: "Iluminação forte para treinos noturnos e trail.",
      tags: ["lanterna", "noturno", "trail"],
      minPriceCents: 25000,
      maxPriceCents: 48000,
    },
    {
      categorySlug: "accessories",
      brand: "SpiBelt",
      product: "Cinto porta-objetos",
      blurb: "Leva celular e chave sem bounce no ritmo.",
      tags: ["spibelt", "cinto", "celular"],
      minPriceCents: 7000,
      maxPriceCents: 15000,
    },
    {
      categorySlug: "accessories",
      brand: "Yaktrax",
      product: "Traction Walk",
      blurb: "Tração extra para treinos em chuva ou lama leve.",
      tags: ["tracao", "chuva", "segurança"],
      minPriceCents: 9000,
      maxPriceCents: 18000,
    },
    {
      categorySlug: "accessories",
      brand: "Foam Roller",
      product: "Rolo de massagem 45cm",
      blurb: "Recuperação de panturrilha e IT band pós-treino.",
      tags: ["foamroller", "recuperacao", "mobilidade"],
      minPriceCents: 4000,
      maxPriceCents: 12000,
    },
    {
      categorySlug: "accessories",
      brand: "TriggerPoint",
      product: "Bola de massagem",
      blurb: "Alívio pontual de pontos gatilho nos pés e glúteos.",
      tags: ["massagem", "recuperacao", "pes"],
      minPriceCents: 3500,
      maxPriceCents: 9000,
    },
    {
      categorySlug: "accessories",
      brand: "Oakley",
      product: "Radar EV Path",
      blurb: "Óculos leve com boa cobertura contra vento e sol.",
      tags: ["oakley", "oculos", "sol"],
      minPriceCents: 45000,
      maxPriceCents: 85000,
    },
    {
      categorySlug: "accessories",
      brand: "GU",
      product: "Kit 12 géis energéticos",
      blurb: "Sabores variados para abastecimento em longões.",
      tags: ["gel", "nutricao", "prova"],
      minPriceCents: 8000,
      maxPriceCents: 16000,
    },
    {
      categorySlug: "accessories",
      brand: "Vargo",
      product: "Bastões de trail dobráveis",
      blurb: "Apoio em subidas longas e descidas técnicas.",
      tags: ["bastao", "trail", "ultramaratona"],
      minPriceCents: 35000,
      maxPriceCents: 65000,
    },
  ];

  function pick<T>(items: readonly T[], index: number): T {
    return items[index % items.length]!;
  }

  function priceBetween(min: number, max: number, index: number): number {
    const span = max - min;
    const step = Math.floor(span / 17);
    return min + (index % 18) * step;
  }

  function slugifyPart(value: string): string {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  if (sellerUser.sellerProfile) {
    const sellerProfileId = sellerUser.sellerProfile.id;
    const featuredSamples = [
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
        city: "São Paulo",
        state: "SP",
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
        city: "São Paulo",
        state: "SP",
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
        city: "São Paulo",
        state: "SP",
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
        city: "São Paulo",
        state: "SP",
        embedding: demoEmbedding(2, 0),
      },
    ];

    const randomListings = Array.from({ length: 50 }, (_, index) => {
      const n = index + 1;
      const item = pick(catalog, index * 3 + 1);
      const category = categoryBySlug[item.categorySlug];
      const location = pick(cities, index * 2 + 3);
      const condition = pick(conditions, index * 5 + 2);
      const kmUsed = 40 + ((index * 37) % 420);
      const sizeHint =
        item.categorySlug === "running-shoes"
          ? ` Número ${36 + (index % 10)}.`
          : item.categorySlug === "apparel"
            ? ` Tamanho ${["P", "M", "G", "GG"][index % 4]}.`
            : "";
      const title = `${item.brand} ${item.product} #${String(n).padStart(2, "0")}`;
      const description = [
        item.blurb,
        `Item do mundo da corrida com cerca de ${kmUsed}km de uso estimado.`,
        sizeHint.trim(),
        "Vendido para fazer espaço e financiar a próxima meta.",
      ]
        .filter(Boolean)
        .join(" ");

      return {
        slug: `seed-run-${String(n).padStart(2, "0")}-${slugifyPart(item.brand)}-${slugifyPart(item.product)}`,
        categoryId: category.id,
        title,
        description,
        priceCents: priceBetween(item.minPriceCents, item.maxPriceCents, index),
        condition,
        tags: [...item.tags, "corrida", "seminovo", `lote-${n}`],
        featured: n <= 6,
        trendingScore: 40 + ((index * 13) % 55),
        city: location.city,
        state: location.state,
        embedding: demoEmbedding(categorySlot[item.categorySlug], n),
      };
    });

    const allListings = [...featuredSamples, ...randomListings];

    for (const sample of allListings) {
      await prisma.listing.upsert({
        where: { slug: sample.slug },
        update: {
          sellerId: sellerUser.id,
          sellerProfileId,
          categoryId: sample.categoryId,
          title: sample.title,
          description: sample.description,
          priceCents: sample.priceCents,
          condition: sample.condition,
          city: sample.city,
          state: sample.state,
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
          sellerProfileId,
          categoryId: sample.categoryId,
          title: sample.title,
          slug: sample.slug,
          description: sample.description,
          priceCents: sample.priceCents,
          condition: sample.condition,
          city: sample.city,
          state: sample.state,
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
                url: "/placeholders/shoe-1.jpg",
                thumbnailUrl: "/placeholders/shoe-1-thumb.jpg",
                sortOrder: 0,
              },
            ],
          },
        },
      });
    }

    console.log(
      `  Listings upserted: ${allListings.length} (${featuredSamples.length} featured + ${randomListings.length} random)`
    );
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
