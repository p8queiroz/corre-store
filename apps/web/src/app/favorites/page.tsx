"use client";

import { Container, Grid, Typography } from "@mui/material";
import { trpc } from "@/lib/trpc";
import { ListingCard } from "@/components/listings/ListingCard";
import Link from "next/link";
import { Button } from "@mui/material";

export default function FavoritesPage() {
  const { data, isLoading } = trpc.favorites.list.useQuery();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={800} gutterBottom>
        Saved listings
      </Typography>
      {isLoading && <Typography>Loading…</Typography>}
      {!isLoading && !data?.length && (
        <>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Sign in to save favorites.
          </Typography>
          <Button component={Link} href="/login" variant="contained">
            Sign in
          </Button>
        </>
      )}
      <Grid container spacing={2} sx={{ mt: 2 }}>
        {data?.map((fav) => (
          <Grid key={fav.id} size={{ xs: 12, sm: 6, md: 3 }}>
            <ListingCard
              slug={fav.listing.slug}
              title={fav.listing.title}
              priceCents={fav.listing.priceCents}
              city={fav.listing.city}
              state={fav.listing.state}
              imageUrl={
                fav.listing.images?.[0]?.thumbnailUrl ?? fav.listing.images?.[0]?.url
              }
              categoryName={fav.listing.category?.name}
            />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
