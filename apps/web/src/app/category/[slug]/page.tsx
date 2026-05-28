"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@apollo/client";
import { Container, Grid, Typography } from "@mui/material";
import { SEARCH_LISTINGS_QUERY } from "@/graphql/queries";
import { ListingCard } from "@/components/listings/ListingCard";

export default function CategoryPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data, loading } = useQuery(SEARCH_LISTINGS_QUERY, {
    variables: { categorySlug: slug, page: 1, limit: 24 },
  });

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={800} gutterBottom sx={{ textTransform: "capitalize" }}>
        {slug.replace(/-/g, " ")}
      </Typography>
      {loading && <Typography>Loading…</Typography>}
      <Grid container spacing={2} sx={{ mt: 2 }}>
        {data?.searchListings?.items?.map((listing) => (
          <Grid key={listing.id} size={{ xs: 12, sm: 6, md: 3 }}>
            <ListingCard
              slug={listing.slug}
              title={listing.title}
              priceCents={listing.priceCents}
              city={listing.city}
              state={listing.state}
              imageUrl={listing.images?.[0]?.url}
              categoryName={listing.category?.name}
            />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
