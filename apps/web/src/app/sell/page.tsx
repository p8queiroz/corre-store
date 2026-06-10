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

const conditionLabels: Record<string, string> = {
  NEW: "Novo",
  LIKE_NEW: "Como novo",
  GOOD: "Bom",
  FAIR: "Regular",
  FOR_PARTS: "Para peças",
};

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
        throw new Error(body.error ?? "Não foi possível habilitar a conta de vendedor.");
      }
      const body = (await res.json()) as { user: SessionUser };
      setSessionUser(body.user);
      setSuccessMessage("Ferramentas de vendedor habilitadas. Você já pode criar seu primeiro anúncio.");
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Não foi possível habilitar a conta de vendedor.");
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
        throw new Error(body.error ?? "Falha ao enviar imagens.");
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
      setSuccessMessage("Anúncio enviado para revisão.");
      setSelectedFiles([]);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Não foi possível enviar o anúncio.");
    }
  }

  if (!authChecked) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography>Carregando ferramentas de vendedor...</Typography>
        </Paper>
      </Container>
    );
  }

  if (!sessionUser) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            Entre para vender
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            As ferramentas de vendedor ficam disponíveis depois que você entra ou cria uma conta de vendedor.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button component={Link} href="/login" variant="contained">
              Entrar
            </Button>
            <Button component={Link} href="/register?asSeller=1" variant="outlined">
              Criar conta de vendedor
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
            Torne-se vendedor
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Habilite as ferramentas de vendedor na sua conta atual para criar anúncios e enviá-los para revisão.
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
            Habilitar ferramentas
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Criar anúncio
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Seus anúncios passam por IA e moderação antes de ficarem públicos.
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
            Assistente de anúncio com IA
          </Button>
          <TextField
            fullWidth
            label="Título"
            margin="normal"
            {...register("title")}
            error={!!errors.title}
            helperText={errors.title?.message}
          />
          <TextField
            fullWidth
            label="Descrição"
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
            Adicionar imagens do produto
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
              {selectedFiles.length} imagem{selectedFiles.length === 1 ? "" : "s"} selecionada{selectedFiles.length === 1 ? "" : "s"}
            </Typography>
          )}
          <TextField
            fullWidth
            label="Preço (centavos)"
            type="number"
            margin="normal"
            {...register("priceCents", { valueAsNumber: true })}
            error={!!errors.priceCents}
            helperText={errors.priceCents?.message}
          />
          <TextField
            fullWidth
            select
            label="Condição"
            margin="normal"
            defaultValue="GOOD"
            {...register("condition")}
          >
            {listingConditionEnum.options.map((c) => (
              <MenuItem key={c} value={c}>
                {conditionLabels[c] ?? c}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            label="ID da categoria"
            margin="normal"
            {...register("categoryId")}
            helperText="Use o ID de categoria gerado pelo seed ou pela consulta GraphQL de categorias"
          />
          <TextField fullWidth label="Cidade" margin="normal" {...register("city")} />
          <TextField fullWidth label="Estado" margin="normal" {...register("state")} />
          <Button
            type="submit"
            variant="contained"
            size="large"
            sx={{ mt: 3 }}
            disabled={createListing.isPending || isUploading}
          >
            {isUploading ? "Enviando imagens..." : "Enviar para revisão"}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
