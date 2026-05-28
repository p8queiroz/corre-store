"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@apollo/client";
import { Container, Grid, Typography, Box, Chip } from "@mui/material";
import { SEARCH_LISTINGS_QUERY } from "@/graphql/queries";
import { ListingCard } from "@/components/listings/ListingCard";

export default function SearchPage() {
  const params = useSearchParams();
  const q = params.get("q") ?? undefined;
  const categorySlug = params.get("category") ?? undefined;
  const ai = params.get("ai");

  const { data, loading } = useQuery(SEARCH_LISTINGS_QUERY, {
    variables: { q, categorySlug, page: 1, limit: 24 },
  });

  const results = data?.searchListings;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={800} gutterBottom>
        Search results
      </Typography>
      {ai && (
        <Chip label="AI-enhanced results" color="secondary" sx={{ mb: 2 }} />
      )}
      {loading && <Typography>Loading…</Typography>}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {results?.total ?? 0} listings found
      </Typography>
      <Grid container spacing={2}>
        {results?.items?.map((listing) => (
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
      {!loading && results?.items?.length === 0 && (
        <Box sx={{ py: 8, textAlign: "center" }}>
          <Typography color="text.secondary">
            No listings yet. Start the API and run db:seed.
          </Typography>
        </Box>
      )}
    </Container>
  );
}
