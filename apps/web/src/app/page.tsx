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

export default async function HomePage() {
  const client = getApolloClient();
  const { data } = await client.query({ query: HOMEPAGE_QUERY });

  const banner = data?.homepageBanners?.[0];
  const featured = data?.featuredListings ?? [];
  const trending = data?.trendingListings ?? [];
  const categories = data?.categories ?? [];

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
                Running gear only — trusted marketplace
              </Typography>
              <Typography variant="h2" component="h1" sx={{ mt: 1, mb: 2 }}>
                {banner?.title ?? "Gear up for your next marathon"}
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9, mb: 3, fontWeight: 400 }}>
                {banner?.subtitle ??
                  "Buy and sell shoes, hydration, wearables, and race-day essentials."}
              </Typography>
              <Stack direction="row" spacing={2}>
                <Button
                  component={Link}
                  href="/search"
                  variant="contained"
                  color="secondary"
                  size="large"
                >
                  Browse listings
                </Button>
                <Button
                  component={Link}
                  href="/register?asSeller=1"
                  variant="outlined"
                  size="large"
                  sx={{ color: "white", borderColor: "rgba(255,255,255,0.5)" }}
                >
                  Start selling
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
          Shop by category
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 6 }}>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              component={Link}
              href={`/category/${cat.slug}`}
              variant="outlined"
            >
              {cat.name}
            </Button>
          ))}
        </Stack>

        <Typography variant="h5" fontWeight={700} gutterBottom>
          Featured
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
                imageUrl={listing.images?.[0]?.thumbnailUrl ?? listing.images?.[0]?.url}
                categoryName={listing.category?.name}
              />
            </Grid>
          ))}
        </Grid>

        <Typography variant="h5" fontWeight={700} gutterBottom>
          Trending now
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
                imageUrl={listing.images?.[0]?.thumbnailUrl ?? listing.images?.[0]?.url}
              />
            </Grid>
          ))}
        </Grid>
      </Container>
    </>
  );
}
