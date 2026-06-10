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
import { resolveMediaUrl } from "@/lib/media";

const conditionLabels: Record<string, string> = {
  NEW: "Novo",
  LIKE_NEW: "Como novo",
  GOOD: "Bom",
  FAIR: "Regular",
  FOR_PARTS: "Para peças",
};

type ListingDetail = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  condition: string;
  city: string;
  state: string;
  tags: string[];
  images?: Array<{ url?: string | null }>;
  category: { name: string };
  seller: { name: string };
};

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

  const listing = data?.listing as ListingDetail | undefined;
  if (!listing) notFound();
  const heroImageUrl = resolveMediaUrl(listing.images?.[0]?.url);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Box
            sx={{
              height: 400,
              borderRadius: 3,
              bgcolor: "grey.200",
              backgroundImage: heroImageUrl ? `url("${heroImageUrl}")` : undefined,
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
            {listing.city}, {listing.state} · {conditionLabels[listing.condition] ?? listing.condition}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 3 }}>
            {listing.tags.map((tag) => (
              <Chip key={tag} label={tag} variant="outlined" size="small" />
            ))}
          </Stack>
          <ContactSellerButton listingId={listing.id} />
          <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>
            Descrição
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
            {listing.description}
          </Typography>
          <Typography variant="subtitle2" sx={{ mt: 4 }}>
            Vendedor: {listing.seller.name}
          </Typography>
        </Grid>
      </Grid>
    </Container>
  );
}
