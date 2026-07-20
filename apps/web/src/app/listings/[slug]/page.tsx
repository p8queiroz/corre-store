import {
  Box,
  Chip,
  Container,
  Grid,
  Stack,
  Typography,
  Button,
} from "@mui/material";
import Link from "next/link";
import { getApolloClient } from "@/lib/apollo-server";
import { LISTING_DETAIL_QUERY } from "@/graphql/queries";
import { notFound } from "next/navigation";
import { ContactSellerButton } from "@/components/listings/ContactSellerButton";
import { ListingCard } from "@/components/listings/ListingCard";
import { resolveMediaUrl } from "@/lib/media";
import { ReportAction } from "@/components/safety/ReportAction";

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
  seller: { id: string; name: string; avatarUrl?: string | null };
};

type SimilarListing = {
  id: string;
  slug: string;
  title: string;
  priceCents: number;
  city: string;
  state: string;
  images?: Array<{ thumbnailUrl?: string | null; url?: string | null }>;
  category?: { name?: string | null };
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
    variables: { slug, similarLimit: 4 },
  });

  const listing = data?.listing as ListingDetail | undefined;
  if (!listing) notFound();
  const similar = (data?.similarListings ?? []) as SimilarListing[];
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
          <ContactSellerButton listingId={listing.id} listingTitle={listing.title} />
          <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>
            Descrição
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
            {listing.description}
          </Typography>
          <Stack spacing={1.5} sx={{ mt: 4 }}>
            <Typography variant="subtitle2">
              Vendedor:{" "}
              <Button component={Link} href={`/sellers/${listing.seller.id}`} size="small">
                {listing.seller.name}
              </Button>
            </Typography>
            <ReportAction
              listingId={listing.id}
              sellerId={listing.seller.id}
              label="Denunciar anúncio"
            />
          </Stack>
        </Grid>
      </Grid>

      {similar.length > 0 && (
        <Box sx={{ mt: 6 }}>
          <Typography variant="h5" fontWeight={800} gutterBottom>
            Itens semelhantes
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Sugestões com base na similaridade de conteúdo do anúncio
          </Typography>
          <Grid container spacing={2}>
            {similar.map((item) => (
              <Grid key={item.id} size={{ xs: 12, sm: 6, md: 3 }}>
                <ListingCard
                  slug={item.slug}
                  title={item.title}
                  priceCents={item.priceCents}
                  city={item.city}
                  state={item.state}
                  imageUrl={
                    item.images?.[0]?.thumbnailUrl ?? item.images?.[0]?.url ?? undefined
                  }
                  categoryName={item.category?.name ?? undefined}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Container>
  );
}
