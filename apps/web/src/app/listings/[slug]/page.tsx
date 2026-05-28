import {
  Box,
  Chip,
  Container,
  Grid,
  Stack,
  Typography,
  Button,
} from "@mui/material";
import { getApolloClient } from "@/lib/apollo-server";
import { LISTING_DETAIL_QUERY } from "@/graphql/queries";
import { notFound } from "next/navigation";
import { ContactSellerButton } from "@/components/listings/ContactSellerButton";

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const client = getApolloClient();
  const { data } = await client.query({
    query: LISTING_DETAIL_QUERY,
    variables: { slug },
  });

  const listing = data?.listing;
  if (!listing) notFound();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Box
            sx={{
              height: 400,
              borderRadius: 3,
              bgcolor: "grey.200",
              backgroundImage: listing.images?.[0]?.url
                ? `url(${listing.images[0].url})`
                : undefined,
              backgroundSize: "cover",
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Chip label={listing.category.name} size="small" sx={{ mb: 1 }} />
          <Typography variant="h4" fontWeight={800} gutterBottom>
            {listing.title}
          </Typography>
          <Typography variant="h4" color="primary.main" fontWeight={800}>
            {formatPrice(listing.priceCents)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ my: 2 }}>
            {listing.city}, {listing.state} · {listing.condition.replace("_", " ")}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 3 }}>
            {listing.tags.map((tag) => (
              <Chip key={tag} label={tag} variant="outlined" size="small" />
            ))}
          </Stack>
          <ContactSellerButton listingId={listing.id} />
          <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>
            Description
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
            {listing.description}
          </Typography>
          <Typography variant="subtitle2" sx={{ mt: 4 }}>
            Seller: {listing.seller.name}
          </Typography>
        </Grid>
      </Grid>
    </Container>
  );
}
