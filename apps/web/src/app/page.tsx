import {
  Box,
  Button,
  Container,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { ListingCard } from "@/components/listings/ListingCard";
import { getApolloClient } from "@/lib/apollo-server";
import { HOMEPAGE_QUERY } from "@/graphql/queries";
import { AiSearchHero } from "@/components/home/AiSearchHero";

type Category = { id: string; slug: string; name: string };
type ListingSummary = {
  id: string;
  slug: string;
  title: string;
  priceCents: number;
  city: string;
  state: string;
  images?: Array<{ thumbnailUrl?: string | null; url?: string | null }>;
  category?: { name?: string | null };
};

const heroTitle =
  "Venda o que você não usa mais e reinvista no próximo passo";
const heroSubtitle =
  "Transforme itens parados em novas possibilidades, com anúncios simples e vendedores reais.";

const legacyHeroTitles = new Set(["Gear up for your next marathon"]);
const legacyHeroSubtitles = new Set(["Trusted running gear from verified sellers"]);

const categoryLabels: Record<string, string> = {
  "running-shoes": "Calçados",
  hydration: "Hidratação",
  wearables: "Eletrônicos vestíveis",
  apparel: "Vestuário",
  accessories: "Acessórios",
};

export default async function HomePage() {
  const client = getApolloClient();
  const { data } = await client.query({ query: HOMEPAGE_QUERY });

  const banner = data?.homepageBanners?.[0];
  const featured = (data?.featuredListings ?? []) as ListingSummary[];
  const trending = (data?.trendingListings ?? []) as ListingSummary[];
  const categories = (data?.categories ?? []) as Category[];
  const displayHeroTitle =
    banner?.title && !legacyHeroTitles.has(banner.title) ? banner.title : heroTitle;
  const displayHeroSubtitle =
    banner?.subtitle && !legacyHeroSubtitles.has(banner.subtitle)
      ? banner.subtitle
      : heroSubtitle;

  return (
    <>
      <Box
        sx={{
          background: `linear-gradient(135deg, #0B6E4F 0%, #084C37 50%, #1A1D21 100%)`,
          color: "white",
          py: { xs: 6, md: 10 },
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid size={{ xs: 12, md: 7 }}>
              <Typography variant="overline" sx={{ opacity: 0.9 }}>
                Marketplace para dar uma nova rodada aos produtos
              </Typography>
              <Typography variant="h2" component="h1" sx={{ mt: 1, mb: 2 }}>
                {displayHeroTitle}
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9, mb: 3, fontWeight: 400 }}>
                {displayHeroSubtitle}
              </Typography>
              <Stack direction="row" spacing={2}>
                <Button
                  component={Link}
                  href="/search"
                  variant="contained"
                  color="secondary"
                  size="large"
                >
                  Ver anúncios
                </Button>
                <Button
                  component={Link}
                  href="/register?asSeller=1"
                  variant="outlined"
                  size="large"
                  sx={{ color: "white", borderColor: "rgba(255,255,255,0.5)" }}
                >
                  Começar a vender
                </Button>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <AiSearchHero />
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Comprar por categoria
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 6 }}>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              component={Link}
              href={`/category/${cat.slug}`}
              variant="outlined"
            >
              {categoryLabels[cat.slug] ?? cat.name}
            </Button>
          ))}
        </Stack>

        <Typography variant="h5" fontWeight={700} gutterBottom>
          Em destaque
        </Typography>
        <Grid container spacing={2} sx={{ mb: 6 }}>
          {featured.map((listing) => (
            <Grid key={listing.id} size={{ xs: 12, sm: 6, md: 3 }}>
              <ListingCard
                slug={listing.slug}
                title={listing.title}
                priceCents={listing.priceCents}
                city={listing.city}
                state={listing.state}
                imageUrl={listing.images?.[0]?.thumbnailUrl ?? listing.images?.[0]?.url ?? undefined}
                categoryName={listing.category?.name ?? undefined}
              />
            </Grid>
          ))}
        </Grid>

        <Typography variant="h5" fontWeight={700} gutterBottom>
          Em alta agora
        </Typography>
        <Grid container spacing={2}>
          {trending.map((listing) => (
            <Grid key={listing.id} size={{ xs: 12, sm: 6, md: 3 }}>
              <ListingCard
                slug={listing.slug}
                title={listing.title}
                priceCents={listing.priceCents}
                city={listing.city}
                state={listing.state}
                imageUrl={listing.images?.[0]?.thumbnailUrl ?? listing.images?.[0]?.url ?? undefined}
              />
            </Grid>
          ))}
        </Grid>
      </Container>
    </>
  );
}
