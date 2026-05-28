"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Box,
  Button,
  Container,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  createListingSchema,
  listingConditionEnum,
} from "@stride/shared";
import { trpc } from "@/lib/trpc";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import StorefrontIcon from "@mui/icons-material/Storefront";
import { useEffect, useState } from "react";
import type { z } from "zod";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type CreateListingFormInput = z.input<typeof createListingSchema>;

type SessionUser = {
  userId: string;
  email: string;
  role: "USER" | "SELLER" | "ADMIN";
};

export default function SellPage() {
  const createListing = trpc.listings.create.useMutation();
  const aiAssist = trpc.ai.assistListing.useMutation();
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isBecomingSeller, setIsBecomingSeller] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<CreateListingFormInput>({
    resolver: zodResolver(createListingSchema),
    defaultValues: { tags: [], imageUrls: [] },
  });

  useEffect(() => {
    let active = true;

    async function loadSession() {
      const res = await fetch(`${apiUrl}/auth/me`, { credentials: "include" });
      if (!active) return;

      if (res.ok) {
        const body = (await res.json()) as { user: SessionUser };
        setSessionUser(body.user);
      }
      setAuthChecked(true);
    }

    void loadSession();
    return () => {
      active = false;
    };
  }, []);

  async function onAiAssist() {
    const result = await aiAssist.mutateAsync({
      title: getValues("title"),
      description: getValues("description"),
      goal: "improve",
    });
    if (result.title) setValue("title", result.title as string);
    if (result.description) setValue("description", result.description as string);
    if (result.tags) setValue("tags", result.tags as string[]);
  }

  async function becomeSeller() {
    setIsBecomingSeller(true);
    setUploadError(null);
    try {
      const res = await fetch(`${apiUrl}/auth/become-seller`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Could not enable seller account");
      }
      const body = (await res.json()) as { user: SessionUser };
      setSessionUser(body.user);
      setSuccessMessage("Seller tools enabled. You can add your first product now.");
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Could not enable seller account");
    } finally {
      setIsBecomingSeller(false);
    }
  }

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

  async function onSubmit(data: CreateListingFormInput) {
    setUploadError(null);
    setSuccessMessage(null);
    try {
      const imageUrls = await uploadImages();
      await createListing.mutateAsync({ ...data, imageUrls });
      setSuccessMessage("Listing submitted for review.");
      setSelectedFiles([]);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Listing submission failed");
    }
  }

  if (!authChecked) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography>Loading seller tools...</Typography>
        </Paper>
      </Container>
    );
  }

  if (!sessionUser) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            Sign in to sell
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Seller tools are available after you sign in or create a seller account.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button component={Link} href="/login" variant="contained">
              Sign in
            </Button>
            <Button component={Link} href="/register?asSeller=1" variant="outlined">
              Create seller account
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  if (sessionUser.role === "USER") {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            Become a seller
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Enable seller tools on your current account to add products and submit listings for review.
          </Typography>
          {uploadError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {uploadError}
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

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Create listing
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Seller dashboard — listings go to AI + admin moderation before going live.
        </Typography>
        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMessage}
          </Alert>
        )}
        {uploadError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {uploadError}
          </Alert>
        )}
        {createListing.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {createListing.error.message}
          </Alert>
        )}
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <Button
            variant="outlined"
            startIcon={<AutoAwesomeIcon />}
            onClick={() => void onAiAssist()}
            disabled={aiAssist.isPending}
            sx={{ mb: 2 }}
          >
            AI listing assistant
          </Button>
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
          <Button
            component="label"
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            sx={{ mt: 2 }}
          >
            Add product images
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              hidden
              onChange={(event) => {
                setSelectedFiles(Array.from(event.target.files ?? []).slice(0, 8));
              }}
            />
          </Button>
          {selectedFiles.length > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {selectedFiles.length} image{selectedFiles.length === 1 ? "" : "s"} selected
            </Typography>
          )}
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
            label="Condition"
            margin="normal"
            defaultValue="GOOD"
            {...register("condition")}
          >
            {listingConditionEnum.options.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            label="Category ID"
            margin="normal"
            {...register("categoryId")}
            helperText="Use category id from seed / GraphQL categories query"
          />
          <TextField fullWidth label="City" margin="normal" {...register("city")} />
          <TextField fullWidth label="State" margin="normal" {...register("state")} />
          <Button
            type="submit"
            variant="contained"
            size="large"
            sx={{ mt: 3 }}
            disabled={createListing.isPending || isUploading}
          >
            {isUploading ? "Uploading images..." : "Submit for review"}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
