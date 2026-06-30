"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import LockIcon from "@mui/icons-material/Lock";
import StorefrontIcon from "@mui/icons-material/Storefront";
import { changePasswordSchema, profileSchema } from "@stride/shared";
import { trpc } from "@/lib/trpc";
import { resolveMediaUrl } from "@/lib/media";
import { ListingCard } from "@/components/listings/ListingCard";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type AccountSection = "overview" | "profile" | "security" | "contact";
type ProfileFormInput = z.input<typeof profileSchema>;
type PasswordFormInput = z.input<typeof changePasswordSchema>;

function AccountNav({ section }: { section: AccountSection }) {
  const items = [
    { key: "overview", label: "Resumo", href: "/account" },
    { key: "profile", label: "Perfil", href: "/account/profile" },
    { key: "security", label: "Segurança", href: "/account/security" },
    { key: "contact", label: "Contato", href: "/account/contact-preferences" },
  ];

  return (
    <Stack direction="row" gap={1} flexWrap="wrap">
      {items.map((item) => (
        <Button
          key={item.key}
          component={Link}
          href={item.href}
          variant={section === item.key ? "contained" : "outlined"}
          size="small"
        >
          {item.label}
        </Button>
      ))}
    </Stack>
  );
}

function AccountShell({ section, children }: { section: AccountSection; children: React.ReactNode }) {
  const account = trpc.account.me.useQuery();

  if (account.isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper sx={{ p: 4 }}>Carregando sua conta...</Paper>
      </Container>
    );
  }

  if (account.error) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            Entre para acessar sua conta
          </Typography>
          <Button component={Link} href="/login" variant="contained">
            Entrar
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            Minha conta
          </Typography>
          <Typography color="text.secondary">
            Um único perfil para comprar, vender e manter seus contatos confiáveis.
          </Typography>
        </Box>
        <AccountNav section={section} />
        {children}
      </Stack>
    </Container>
  );
}

function ProfileForm({ contactOnly = false }: { contactOnly?: boolean }) {
  const account = trpc.account.me.useQuery();
  const utils = trpc.useUtils();
  const [message, setMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const update = trpc.account.updateProfile.useMutation({
    onSuccess: async () => {
      setMessage("Perfil atualizado.");
      await utils.account.me.invalidate();
    },
  });
  const avatar = trpc.account.updateAvatar.useMutation({
    onSuccess: async () => utils.account.me.invalidate(),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (!account.data) return;
    reset({
      name: account.data.name,
      whatsappNumber: account.data.whatsappNumber ?? "",
      city: account.data.city ?? "",
      state: account.data.state ?? "",
      bio: account.data.bio ?? "",
      instagramUrl: account.data.instagramUrl ?? "",
      stravaUrl: account.data.stravaUrl ?? "",
      websiteUrl: account.data.websiteUrl ?? "",
    });
  }, [account.data, reset]);

  async function uploadAvatar(file: File) {
    setUploadError(null);
    const formData = new FormData();
    formData.append("avatar", file);
    const res = await fetch(`${apiUrl}/uploads/avatar`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      setUploadError(body.error ?? "Falha ao enviar foto.");
      return;
    }
    const body = (await res.json()) as { url: string };
    await avatar.mutateAsync({ avatarUrl: body.url });
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }}>
          <Avatar src={resolveMediaUrl(account.data?.avatarUrl) ?? undefined} sx={{ width: 72, height: 72 }} />
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />}>
              Trocar foto
              <input
                hidden
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadAvatar(file);
                }}
              />
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => avatar.mutate({ avatarUrl: null })}
            >
              Remover
            </Button>
          </Stack>
        </Stack>
        {uploadError && <Alert severity="error">{uploadError}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}
        {update.error && <Alert severity="error">{update.error.message}</Alert>}
        <Box component="form" onSubmit={handleSubmit((data) => update.mutate(data))}>
          <Stack spacing={2}>
            {!contactOnly && (
              <>
                <TextField label="Nome" fullWidth {...register("name")} error={!!errors.name} helperText={errors.name?.message} />
                <TextField label="Bio" fullWidth multiline minRows={4} {...register("bio")} error={!!errors.bio} helperText={errors.bio?.message} />
              </>
            )}
            <TextField label="WhatsApp" fullWidth {...register("whatsappNumber")} error={!!errors.whatsappNumber} helperText={errors.whatsappNumber?.message ?? "Inclua DDI e DDD. Ex.: 5511999990000"} />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Cidade" fullWidth {...register("city")} error={!!errors.city} helperText={errors.city?.message} />
              <TextField label="Estado" fullWidth {...register("state")} error={!!errors.state} helperText={errors.state?.message} />
            </Stack>
            {!contactOnly && (
              <>
                <TextField label="Instagram URL" fullWidth {...register("instagramUrl")} error={!!errors.instagramUrl} helperText={errors.instagramUrl?.message} />
                <TextField label="Strava URL" fullWidth {...register("stravaUrl")} error={!!errors.stravaUrl} helperText={errors.stravaUrl?.message} />
                <TextField label="Site ou outro perfil" fullWidth {...register("websiteUrl")} error={!!errors.websiteUrl} helperText={errors.websiteUrl?.message} />
              </>
            )}
            <Button type="submit" variant="contained" disabled={update.isPending}>
              Salvar perfil
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
}

function SecurityPanel() {
  const [message, setMessage] = useState<string | null>(null);
  const change = trpc.account.changePassword.useMutation({
    onSuccess: () => setMessage("Senha alterada."),
  });
  const deactivate = trpc.account.deactivate.useMutation({
    onSuccess: () => setMessage("Conta desativada. Anúncios ativos foram removidos."),
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormInput>({ resolver: zodResolver(changePasswordSchema) });

  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h6" fontWeight={800}>
          Alterar senha
        </Typography>
        {message && <Alert severity="success">{message}</Alert>}
        {change.error && <Alert severity="error">{change.error.message}</Alert>}
        {deactivate.error && <Alert severity="error">{deactivate.error.message}</Alert>}
        <Box
          component="form"
          onSubmit={handleSubmit(async (data) => {
            await change.mutateAsync(data);
            reset();
          })}
        >
          <Stack spacing={2}>
            <TextField label="Senha atual" type="password" fullWidth {...register("currentPassword")} error={!!errors.currentPassword} helperText={errors.currentPassword?.message} />
            <TextField label="Nova senha" type="password" fullWidth {...register("newPassword")} error={!!errors.newPassword} helperText={errors.newPassword?.message} />
            <TextField label="Confirmar nova senha" type="password" fullWidth {...register("confirmPassword")} error={!!errors.confirmPassword} helperText={errors.confirmPassword?.message} />
            <Button type="submit" variant="contained" startIcon={<LockIcon />} disabled={change.isPending}>
              Alterar senha
            </Button>
          </Stack>
        </Box>
        <Divider />
        <Stack spacing={1} alignItems="flex-start">
          <Typography variant="h6" fontWeight={800}>
            Desativar conta
          </Typography>
          <Typography variant="body2" color="text.secondary">
            A conta será suspensa e anúncios em aberto serão removidos da navegação pública.
          </Typography>
          <Button
            variant="outlined"
            color="error"
            disabled={deactivate.isPending}
            onClick={() => {
              if (window.confirm("Desativar sua conta no StrideMarket?")) {
                deactivate.mutate();
              }
            }}
          >
            Desativar conta
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

function OverviewPanel() {
  const account = trpc.account.me.useQuery();
  const inquiries = trpc.contact.myInquiries.useQuery();
  const rows = inquiries.data ?? [];
  const completion = useMemo(() => {
    const data = account.data;
    const checks = [
      Boolean(data?.name),
      Boolean(data?.avatarUrl),
      Boolean(data?.whatsappNumber),
      Boolean(data?.city && data?.state),
      Boolean(data?.bio),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [account.data]);

  return (
    <Stack spacing={3}>
      <Paper sx={{ p: 3 }}>
        <Stack spacing={1}>
          <Typography variant="h6" fontWeight={800}>
            Perfil {completion}% completo
          </Typography>
          <Stack direction="row" gap={1} flexWrap="wrap">
            <Chip label={account.data?.role ?? "USER"} />
            {account.data?.whatsappConfirmedAt && <Chip label="WhatsApp confirmado" color="success" />}
            <Chip label={account.data?.status ?? "PENDING"} variant="outlined" />
          </Stack>
          <Button component={Link} href="/sell" variant="contained" startIcon={<StorefrontIcon />} sx={{ alignSelf: "flex-start" }}>
            Tornar-se vendedor ou criar anúncio
          </Button>
        </Stack>
      </Paper>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={800} gutterBottom>
          Histórico de contatos
        </Typography>
        <Stack spacing={2} divider={<Divider flexItem />}>
          {!rows.length && <Typography color="text.secondary">Você ainda não contactou nenhum vendedor.</Typography>}
          {rows.map((inquiry) => (
            <Stack key={inquiry.id} direction={{ xs: "column", sm: "row" }} gap={2}>
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={800}>{inquiry.listing.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {inquiry.contactMethod} · {new Date(inquiry.createdAt).toLocaleDateString("pt-BR")}
                </Typography>
              </Box>
              <Button component={Link} href={`/listings/${inquiry.listing.slug}`} variant="outlined">
                Ver anúncio
              </Button>
            </Stack>
          ))}
        </Stack>
      </Paper>
      {rows.length > 0 && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 2 }}>
          {rows.slice(0, 4).map((inquiry) => (
            <ListingCard
              key={inquiry.id}
              slug={inquiry.listing.slug}
              title={inquiry.listing.title}
              priceCents={inquiry.listing.priceCents}
              city={inquiry.listing.city}
              state={inquiry.listing.state}
              imageUrl={inquiry.listing.images?.[0]?.thumbnailUrl ?? inquiry.listing.images?.[0]?.url}
              categoryName={inquiry.listing.category?.name}
            />
          ))}
        </Box>
      )}
    </Stack>
  );
}

export function AccountClient({ section }: { section: AccountSection }) {
  let content: React.ReactNode;
  if (section === "profile") content = <ProfileForm />;
  else if (section === "security") content = <SecurityPanel />;
  else if (section === "contact") content = <ProfileForm contactOnly />;
  else content = <OverviewPanel />;

  return <AccountShell section={section}>{content}</AccountShell>;
}
