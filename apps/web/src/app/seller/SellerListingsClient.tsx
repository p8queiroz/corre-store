"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@apollo/client";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import StorefrontIcon from "@mui/icons-material/Storefront";
import { createListingSchema, listingConditionEnum } from "@stride/shared";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { CATEGORIES_QUERY } from "@/graphql/queries";
import { resolveMediaUrl } from "@/lib/media";
import { trpc } from "@/lib/trpc";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type SessionUser = {
  userId: string;
  email: string;
  role: "USER" | "SELLER" | "ADMIN";
};
type ListingFormInput = z.input<typeof createListingSchema>;
type ListingRow = {
  id: string;
  title: string;
  slug: string;
  description: string;
  priceCents: number;
  condition: "NEW" | "LIKE_NEW" | "GOOD" | "FAIR" | "FOR_PARTS";
  categoryId: string;
  city: string;
  state: string;
  tags: string[];
  status: string;
  moderation: string;
  moderationNote?: string | null;
  updatedAt: Date;
  images: Array<{ id: string; url: string; thumbnailUrl?: string | null }>;
  category?: { name: string };
};
type CategoryOption = { id: string; slug: string; name: string };

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function statusColor(value: string) {
  if (value === "ACTIVE" || value === "APPROVED") return "success";
  if (value === "REJECTED" || value === "REMOVED") return "error";
  if (value === "FLAGGED" || value === "PENDING" || value === "PENDING_REVIEW") return "warning";
  return "default";
}

function StatusChip({ value }: { value: string }) {
  return (
    <Chip
      label={value.replace("_", " ")}
      color={statusColor(value)}
      size="small"
      variant="outlined"
    />
  );
}

function SellerGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBecomingSeller, setIsBecomingSeller] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadSession() {
      try {
        const res = await fetch(`${apiUrl}/auth/me`, { credentials: "include" });
        if (!active) return;
        if (res.ok) {
          const body = (await res.json()) as { user: SessionUser };
          setUser(body.user);
        }
      } catch {
        if (active) setError("Could not reach the API session endpoint.");
      } finally {
        if (active) setChecked(true);
      }
    }
    void loadSession();
    return () => {
      active = false;
    };
  }, []);

  async function becomeSeller() {
    setIsBecomingSeller(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/auth/become-seller`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Could not enable seller tools");
      }
      const body = (await res.json()) as { user: SessionUser };
      setUser(body.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not enable seller tools");
    } finally {
      setIsBecomingSeller(false);
    }
  }

  if (!checked) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography>Loading seller tools...</Typography>
        </Paper>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            Sign in to manage listings
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Seller listing management is available after you sign in.
          </Typography>
          <Button component={Link} href="/login" variant="contained">
            Sign in
          </Button>
        </Paper>
      </Container>
    );
  }

  if (user.role === "USER") {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            Enable seller tools
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Regular accounts need seller tools before they can manage products.
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Button
            variant="contained"
            size="large"
            startIcon={<StorefrontIcon />}
            onClick={() => void becomeSeller()}
            disabled={isBecomingSeller}
          >
            Enable seller tools
          </Button>
        </Paper>
      </Container>
    );
  }

  return <>{children}</>;
}

export function SellerListingsPage() {
  const listings = trpc.listings.listMine.useQuery();

  return (
    <SellerGate>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            gap={2}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", sm: "center" }}
          >
            <Box>
              <Typography variant="h4" fontWeight={800} gutterBottom>
                My listings
              </Typography>
              <Typography color="text.secondary">
                Review listing status, update product details, and manage images.
              </Typography>
            </Box>
            <Button component={Link} href="/sell" variant="contained">
              Create listing
            </Button>
          </Stack>

          <Paper sx={{ p: 3 }}>
            <Stack spacing={2}>
              {listings.isLoading && <Typography>Loading listings...</Typography>}
              {listings.error && <Alert severity="error">{listings.error.message}</Alert>}
              {!listings.isLoading && !listings.data?.length && (
                <Typography color="text.secondary">No listings yet.</Typography>
              )}
              {((listings.data ?? []) as ListingRow[]).map((listing) => (
                <Stack
                  key={listing.id}
                  direction={{ xs: "column", md: "row" }}
                  gap={2}
                  alignItems={{ xs: "stretch", md: "center" }}
                  sx={{ borderBottom: 1, borderColor: "divider", pb: 2 }}
                >
                  <Box
                    component="img"
                    src={resolveMediaUrl(listing.images[0]?.thumbnailUrl ?? listing.images[0]?.url) ?? "/placeholders/shoe-1-thumb.jpg"}
                    alt={listing.title}
                    sx={{
                      width: { xs: "100%", md: 112 },
                      height: 84,
                      objectFit: "cover",
                      borderRadius: 1,
                      bgcolor: "grey.100",
                    }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight={800}>{listing.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {listing.category?.name ?? "Uncategorized"} · {money(listing.priceCents)} ·{" "}
                      {listing.city}, {listing.state}
                    </Typography>
                    <Stack direction="row" gap={0.75} flexWrap="wrap" sx={{ mt: 1 }}>
                      <StatusChip value={listing.status} />
                      <StatusChip value={listing.moderation} />
                    </Stack>
                    {listing.moderationNote && (
                      <Typography variant="body2" color="error.main" sx={{ mt: 1 }}>
                        {listing.moderationNote}
                      </Typography>
                    )}
                  </Box>
                  <Stack direction="row" gap={1}>
                    <Button
                      component={Link}
                      href={`/listings/${listing.slug}`}
                      size="small"
                      variant="outlined"
                    >
                      View
                    </Button>
                    <Button
                      component={Link}
                      href={`/seller/listings/${listing.id}/edit`}
                      size="small"
                      variant="contained"
                      startIcon={<EditIcon />}
                    >
                      Edit
                    </Button>
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </SellerGate>
  );
}

export function SellerListingEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const listing = trpc.listings.getMine.useQuery({ listingId: params.id });
  const update = trpc.listings.updateMine.useMutation({
    onSuccess: async () => {
      await utils.listings.invalidate();
      setSuccess("Listing saved and sent back to review.");
    },
  });
  const categories = useQuery<{ categories: CategoryOption[] }>(CATEGORIES_QUERY);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ListingFormInput>({
    resolver: zodResolver(createListingSchema),
    defaultValues: { tags: [], imageUrls: [] },
  });

  useEffect(() => {
    const row = listing.data as ListingRow | undefined;
    if (!row) return;
    reset({
      title: row.title,
      description: row.description,
      priceCents: row.priceCents,
      condition: row.condition,
      categoryId: row.categoryId,
      city: row.city,
      state: row.state,
      tags: row.tags,
      imageUrls: row.images.map((image) => image.url),
    });
    setImageUrls(row.images.map((image) => image.url));
  }, [listing.data, reset]);

  async function uploadImages() {
    if (!selectedFiles.length) return [];
    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append("images", file));

    setIsUploading(true);
    try {
      const res = await fetch(`${apiUrl}/uploads/listing-images`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Image upload failed");
      }
      const body = (await res.json()) as { urls: string[] };
      return body.urls;
    } finally {
      setIsUploading(false);
    }
  }

  async function onSubmit(data: ListingFormInput) {
    setUploadError(null);
    setSuccess(null);
    try {
      const uploadedUrls = await uploadImages();
      const nextImageUrls = [...imageUrls, ...uploadedUrls].slice(0, 8);
      await update.mutateAsync({
        listingId: params.id,
        data: {
          ...data,
          tags:
            typeof data.tags === "string"
              ? String(data.tags)
                  .split(",")
                  .map((tag) => tag.trim().toLowerCase())
                  .filter(Boolean)
              : data.tags,
          imageUrls: nextImageUrls,
        },
      });
      setImageUrls(nextImageUrls);
      setSelectedFiles([]);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Listing update failed");
    }
  }

  return (
    <SellerGate>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Button
            variant="text"
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push("/seller")}
            sx={{ alignSelf: "flex-start" }}
          >
            My listings
          </Button>

          <Paper sx={{ p: 4 }}>
            <Typography variant="h4" fontWeight={800} gutterBottom>
              Edit listing
            </Typography>
            {(listing.data as ListingRow | undefined) && (
              <Stack direction="row" gap={0.75} flexWrap="wrap" sx={{ mb: 2 }}>
                <StatusChip value={(listing.data as ListingRow).status} />
                <StatusChip value={(listing.data as ListingRow).moderation} />
              </Stack>
            )}
            {listing.isLoading && <Typography>Loading listing...</Typography>}
            {listing.error && <Alert severity="error">{listing.error.message}</Alert>}
            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}
            {uploadError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {uploadError}
              </Alert>
            )}
            {update.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {update.error.message}
              </Alert>
            )}

            {listing.data && (
              <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <TextField
                  fullWidth
                  label="Title"
                  margin="normal"
                  {...register("title")}
                  error={!!errors.title}
                  helperText={errors.title?.message}
                />
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  minRows={4}
                  margin="normal"
                  {...register("description")}
                  error={!!errors.description}
                  helperText={errors.description?.message}
                />
                <TextField
                  fullWidth
                  label="Price (cents)"
                  type="number"
                  margin="normal"
                  {...register("priceCents", { valueAsNumber: true })}
                  error={!!errors.priceCents}
                  helperText={errors.priceCents?.message}
                />
                <TextField
                  fullWidth
                  select
                  label="Category"
                  margin="normal"
                  defaultValue={(listing.data as ListingRow).categoryId}
                  {...register("categoryId")}
                  error={!!errors.categoryId}
                  helperText={errors.categoryId?.message}
                >
                  {(categories.data?.categories ?? []).map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  fullWidth
                  select
                  label="Condition"
                  margin="normal"
                  defaultValue={(listing.data as ListingRow).condition}
                  {...register("condition")}
                >
                  {listingConditionEnum.options.map((condition) => (
                    <MenuItem key={condition} value={condition}>
                      {condition.replace("_", " ")}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField fullWidth label="City" margin="normal" {...register("city")} />
                <TextField fullWidth label="State" margin="normal" {...register("state")} />
                <TextField
                  fullWidth
                  label="Tags"
                  margin="normal"
                  {...register("tags")}
                  helperText="Comma-separated tags"
                />

                <Typography variant="h6" fontWeight={800} sx={{ mt: 3, mb: 1 }}>
                  Images
                </Typography>
                <Stack direction="row" gap={1.5} flexWrap="wrap">
                  {imageUrls.map((url) => (
                    <Box key={url} sx={{ position: "relative" }}>
                      <Box
                        component="img"
                        src={resolveMediaUrl(url)}
                        alt=""
                        sx={{ width: 120, height: 90, objectFit: "cover", borderRadius: 1 }}
                      />
                      <IconButton
                        aria-label="Remove image"
                        size="small"
                        onClick={() => setImageUrls((current) => current.filter((item) => item !== url))}
                        sx={{ position: "absolute", top: 4, right: 4, bgcolor: "background.paper" }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<CloudUploadIcon />}
                  sx={{ mt: 2 }}
                  disabled={imageUrls.length >= 8}
                >
                  Add product images
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    hidden
                    onChange={(event) => {
                      const remaining = 8 - imageUrls.length;
                      setSelectedFiles(Array.from(event.target.files ?? []).slice(0, remaining));
                    }}
                  />
                </Button>
                {selectedFiles.length > 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {selectedFiles.length} image{selectedFiles.length === 1 ? "" : "s"} selected
                  </Typography>
                )}

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  sx={{ mt: 3 }}
                  disabled={update.isPending || isUploading}
                >
                  {isUploading ? "Uploading images..." : "Save changes"}
                </Button>
              </Box>
            )}
          </Paper>
        </Stack>
      </Container>
    </SellerGate>
  );
}
