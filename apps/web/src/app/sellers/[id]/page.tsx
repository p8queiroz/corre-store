"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Avatar, Box, Button, Chip, Container, Paper, Stack, Typography } from "@mui/material";
import InstagramIcon from "@mui/icons-material/Instagram";
import VerifiedIcon from "@mui/icons-material/Verified";
import { trpc } from "@/lib/trpc";
import { resolveMediaUrl } from "@/lib/media";
import { ListingCard } from "@/components/listings/ListingCard";
import { ReportAction } from "@/components/safety/ReportAction";
import { SafetyWarning } from "@/components/safety/SafetyWarning";

export default function PublicSellerPage() {
  const params = useParams<{ id: string }>();
  const seller = trpc.listings.publicSeller.useQuery({ userId: params.id });
  const data = seller.data;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {seller.isLoading && <Paper sx={{ p: 4 }}>Carregando perfil...</Paper>}
      {seller.error && <Paper sx={{ p: 4 }}>Vendedor não encontrado.</Paper>}
      {data && (
        <Stack spacing={3}>
          <Paper sx={{ p: 3 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }}>
              <Avatar src={resolveMediaUrl(data.seller.avatarUrl) ?? undefined} sx={{ width: 88, height: 88 }} />
              <Box sx={{ flex: 1 }}>
                <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                  <Typography variant="h4" fontWeight={800}>
                    {data.seller.name}
                  </Typography>
                  {data.trust.profileVerified && <VerifiedIcon color="primary" />}
                </Stack>
                <Typography color="text.secondary">
                  No StrideMarket desde {new Date(data.trust.joinedAt).toLocaleDateString("pt-BR")}
                  {data.seller.city && data.seller.state ? ` · ${data.seller.city}, ${data.seller.state}` : ""}
                </Typography>
                {data.seller.bio && <Typography sx={{ mt: 1 }}>{data.seller.bio}</Typography>}
                <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 2 }}>
                  <Chip label={`${data.trust.approvedListings} anúncios aprovados`} />
                  <Chip label={`${data.trust.activeListings} ativos`} />
                  {data.trust.whatsappConfirmed && <Chip label="WhatsApp confirmado" color="success" />}
                  {data.trust.profileVerified && <Chip label="Perfil verificado" color="primary" />}
                </Stack>
              </Box>
              <ReportAction sellerId={data.seller.id} label="Denunciar vendedor" />
            </Stack>
          </Paper>
          <SafetyWarning />
          <Stack direction="row" gap={1} flexWrap="wrap">
            {data.seller.instagramUrl && (
              <Button href={data.seller.instagramUrl} target="_blank" rel="noopener noreferrer" variant="outlined" startIcon={<InstagramIcon />}>
                Instagram
              </Button>
            )}
            {data.seller.stravaUrl && (
              <Button href={data.seller.stravaUrl} target="_blank" rel="noopener noreferrer" variant="outlined">
                Strava
              </Button>
            )}
            {data.seller.websiteUrl && (
              <Button href={data.seller.websiteUrl} target="_blank" rel="noopener noreferrer" variant="outlined">
                Outro perfil
              </Button>
            )}
          </Stack>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 2 }}>
            {data.listings.map((listing) => (
              <ListingCard
                key={listing.id}
                slug={listing.slug}
                title={listing.title}
                priceCents={listing.priceCents}
                city={listing.city}
                state={listing.state}
                imageUrl={listing.images?.[0]?.thumbnailUrl ?? listing.images?.[0]?.url}
                categoryName={listing.category?.name}
              />
            ))}
          </Box>
          {!data.listings.length && (
            <Paper sx={{ p: 3 }}>
              <Typography color="text.secondary">Este vendedor não tem anúncios ativos no momento.</Typography>
              <Button component={Link} href="/search" sx={{ mt: 1 }}>
                Buscar outros anúncios
              </Button>
            </Paper>
          )}
        </Stack>
      )}
    </Container>
  );
}
