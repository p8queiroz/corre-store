import Link from "next/link";
import {
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Chip,
  Typography,
} from "@mui/material";

export interface ListingCardProps {
  slug: string;
  title: string;
  priceCents: number;
  city: string;
  state: string;
  imageUrl?: string;
  categoryName?: string;
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function ListingCard({
  slug,
  title,
  priceCents,
  city,
  state,
  imageUrl,
  categoryName,
}: ListingCardProps) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardActionArea component={Link} href={`/listings/${slug}`} sx={{ height: "100%" }}>
        <CardMedia
          component="div"
          sx={{
            height: 180,
            bgcolor: "grey.200",
            backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <CardContent>
          {categoryName && (
            <Chip label={categoryName} size="small" sx={{ mb: 1 }} />
          )}
          <Typography variant="subtitle1" fontWeight={700} gutterBottom noWrap>
            {title}
          </Typography>
          <Typography variant="h6" color="primary.main" fontWeight={800}>
            {formatPrice(priceCents)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {city}, {state}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
