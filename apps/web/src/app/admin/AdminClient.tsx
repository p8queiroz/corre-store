"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DoNotDisturbIcon from "@mui/icons-material/DoNotDisturb";
import FlagIcon from "@mui/icons-material/Flag";
import GroupIcon from "@mui/icons-material/Group";
import HomeRepairServiceIcon from "@mui/icons-material/HomeRepairService";
import ListAltIcon from "@mui/icons-material/ListAlt";
import ReportIcon from "@mui/icons-material/Report";
import ViewCarouselIcon from "@mui/icons-material/ViewCarousel";
import { trpc } from "@/lib/trpc";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type AdminSection = "overview" | "listings" | "users" | "banners" | "reports" | "jobs";
type SessionUser = { userId: string; email: string; role: "USER" | "SELLER" | "ADMIN" };
type ListingRow = {
  id: string;
  title: string;
  slug: string;
  priceCents: number;
  status: string;
  moderation: string;
  moderationNote?: string | null;
  featured: boolean;
  city: string;
  state: string;
  createdAt: Date;
  category?: { name: string };
  seller?: { name: string; email: string };
  moderationLogs?: Array<{ id: string; decision: string; reason?: string | null }>;
};
type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "SELLER" | "ADMIN";
  status: string;
  createdAt: Date;
  sellerProfile?: { displayName: string; isVerified: boolean } | null;
};
type BannerRow = {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  linkUrl?: string | null;
  sortOrder: number;
  active: boolean;
};
type ReportRow = {
  id: string;
  reason: string;
  details?: string | null;
  resolved: boolean;
  createdAt: Date;
  reporter: { name: string; email: string };
  listing?: { title: string; slug: string; seller: { name: string; email: string } } | null;
};
type JobRow = {
  id: string;
  queue: string;
  status: string;
  attempts: number;
  error?: string | null;
  createdAt: Date;
};

const sections: Array<{ key: AdminSection; label: string; href: string }> = [
  { key: "overview", label: "Visão geral", href: "/admin" },
  { key: "listings", label: "Anúncios", href: "/admin/listings" },
  { key: "users", label: "Usuários", href: "/admin/users" },
  { key: "banners", label: "Banners", href: "/admin/banners" },
  { key: "reports", label: "Denúncias", href: "/admin/reports" },
  { key: "jobs", label: "Jobs", href: "/admin/jobs" },
];

const statusLabels: Record<string, string> = {
  ACTIVE: "Ativo",
  ADMIN: "Admin",
  APPROVED: "Aprovado",
  COMPLETED: "Concluído",
  DRAFT: "Rascunho",
  FAILED: "Falhou",
  FLAGGED: "Sinalizado",
  OPEN: "Aberto",
  PENDING: "Pendente",
  PENDING_REVIEW: "Em revisão",
  REJECTED: "Rejeitado",
  REMOVED: "Removido",
  RESOLVED: "Resolvido",
  SELLER: "Vendedor",
  SOLD: "Vendido",
  SUSPENDED: "Suspenso",
  USER: "Usuário",
};

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function StatusChip({ value }: { value: string }) {
  const color =
    value === "APPROVED" || value === "ACTIVE" || value === "COMPLETED"
      ? "success"
      : value === "REJECTED" || value === "FAILED" || value === "SUSPENDED"
        ? "error"
        : value === "FLAGGED"
          ? "warning"
          : "default";

  return <Chip label={statusLabels[value] ?? value.replace("_", " ")} color={color} size="small" variant="outlined" />;
}

function AdminNav({ section }: { section: AdminSection }) {
  return (
    <Stack direction="row" gap={1} flexWrap="wrap">
      {sections.map((item) => (
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

function AdminGate({ children, section }: { children: React.ReactNode; section: AdminSection }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checked, setChecked] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let active = true;
    async function loadSession() {
      const res = await fetch(`${apiUrl}/auth/me`, { credentials: "include" });
      if (!active) return;
      if (res.ok) {
        const body = (await res.json()) as { user: SessionUser };
        setUser(body.user);
      }
      setChecked(true);
    }
    void loadSession();
    return () => {
      active = false;
    };
  }, [pathname]);

  if (!checked) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography>Carregando ferramentas de admin...</Typography>
        </Paper>
      </Container>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            Acesso de admin necessário
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Entre como admin@stridemarket.local para gerenciar moderação, usuários e conteúdo da plataforma.
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
            Painel admin
          </Typography>
          <Typography color="text.secondary">
            Logado como {user.email}. Contas admin são criadas apenas pelo seed.
          </Typography>
        </Box>
        <AdminNav section={section} />
        {children}
      </Stack>
    </Container>
  );
}

function OverviewPanel() {
  const dashboard = trpc.admin.dashboard.useQuery();
  const counts = dashboard.data?.counts;
  const tiles = [
    { label: "Anúncios pendentes", value: counts?.pendingListings ?? 0, icon: <ListAltIcon /> },
    { label: "Anúncios sinalizados", value: counts?.flaggedListings ?? 0, icon: <FlagIcon /> },
    { label: "Anúncios ativos", value: counts?.activeListings ?? 0, icon: <CheckCircleIcon /> },
    { label: "Denúncias abertas", value: counts?.openReports ?? 0, icon: <ReportIcon /> },
    { label: "Usuários", value: counts?.users ?? 0, icon: <GroupIcon /> },
    { label: "Jobs com falha", value: counts?.failedJobs ?? 0, icon: <HomeRepairServiceIcon /> },
    { label: "Banners ativos", value: counts?.activeBanners ?? 0, icon: <ViewCarouselIcon /> },
  ];

  return (
    <Stack spacing={3}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
          gap: 2,
        }}
      >
        {tiles.map((tile) => (
          <Paper key={tile.label} sx={{ p: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              {tile.icon}
              <Box>
                <Typography variant="h5" fontWeight={800}>
                  {tile.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {tile.label}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        ))}
      </Box>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={800} gutterBottom>
          Anúncios recentes
        </Typography>
        <ListingsTable listings={(dashboard.data?.recentListings ?? []) as ListingRow[]} compact />
      </Paper>
    </Stack>
  );
}

function ListingsTable({ listings, compact = false }: { listings: ListingRow[]; compact?: boolean }) {
  const utils = trpc.useUtils();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const approve = trpc.admin.approveListing.useMutation({
    onSuccess: async () => {
      await utils.admin.invalidate();
    },
  });
  const reject = trpc.admin.rejectListing.useMutation({
    onSuccess: async () => {
      setRejectingId(null);
      setNote("");
      await utils.admin.invalidate();
    },
  });
  const feature = trpc.admin.setListingFeatured.useMutation({
    onSuccess: async () => {
      await utils.admin.invalidate();
    },
  });

  if (!listings.length) {
    return <Typography color="text.secondary">Nenhum anúncio encontrado.</Typography>;
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Anúncio</TableCell>
          <TableCell>Vendedor</TableCell>
          <TableCell>Status</TableCell>
          {!compact && <TableCell>Destaque</TableCell>}
          {!compact && <TableCell align="right">Ações</TableCell>}
        </TableRow>
      </TableHead>
      <TableBody>
        {listings.map((listing) => (
          <TableRow key={listing.id} hover>
            <TableCell>
              <Stack spacing={0.5}>
                <Typography fontWeight={700}>{listing.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {listing.category?.name ?? "Sem categoria"} · {money(listing.priceCents)} ·{" "}
                  {listing.city}, {listing.state}
                </Typography>
                {listing.moderationNote && (
                  <Typography variant="body2" color="error.main">
                    {listing.moderationNote}
                  </Typography>
                )}
              </Stack>
            </TableCell>
            <TableCell>
              <Typography variant="body2">{listing.seller?.name ?? "Desconhecido"}</Typography>
              <Typography variant="caption" color="text.secondary">
                {listing.seller?.email}
              </Typography>
            </TableCell>
            <TableCell>
              <Stack direction="row" gap={0.5} flexWrap="wrap">
                <StatusChip value={listing.status} />
                <StatusChip value={listing.moderation} />
              </Stack>
            </TableCell>
            {!compact && (
              <TableCell>
                <Switch
                  checked={listing.featured}
                  onChange={(event) =>
                    feature.mutate({ listingId: listing.id, featured: event.target.checked })
                  }
                />
              </TableCell>
            )}
            {!compact && (
              <TableCell align="right">
                <Stack spacing={1} alignItems="flex-end">
                  <Stack direction="row" gap={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      color="success"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => approve.mutate({ listingId: listing.id })}
                      disabled={approve.isPending}
                    >
                      Aprovar
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<DoNotDisturbIcon />}
                      onClick={() => setRejectingId(listing.id)}
                    >
                      Rejeitar
                    </Button>
                  </Stack>
                  {rejectingId === listing.id && (
                    <Stack direction={{ xs: "column", md: "row" }} gap={1}>
                      <TextField
                        size="small"
                        label="Nota de moderação"
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                      />
                      <Button
                        size="small"
                        variant="contained"
                        color="error"
                        onClick={() => reject.mutate({ listingId: listing.id, note })}
                        disabled={note.trim().length < 3 || reject.isPending}
                      >
                        Confirmar
                      </Button>
                    </Stack>
                  )}
                </Stack>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ListingsPanel() {
  const queue = trpc.admin.moderationQueue.useQuery();
  const listings = trpc.admin.listings.useQuery();

  return (
    <Stack spacing={3}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={800} gutterBottom>
          Fila de moderação
        </Typography>
        <ListingsTable listings={(queue.data ?? []) as ListingRow[]} />
      </Paper>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={800} gutterBottom>
          Todos os anúncios
        </Typography>
        <ListingsTable listings={(listings.data ?? []) as ListingRow[]} />
      </Paper>
    </Stack>
  );
}

function UsersPanel() {
  const users = trpc.admin.users.useQuery();
  const utils = trpc.useUtils();
  const promote = trpc.admin.promoteUser.useMutation({
    onSuccess: async () => utils.admin.users.invalidate(),
  });
  const setStatus = trpc.admin.setUserStatus.useMutation({
    onSuccess: async () => utils.admin.users.invalidate(),
  });

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight={800} gutterBottom>
        Usuários
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Usuário</TableCell>
            <TableCell>Perfil</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Perfil de vendedor</TableCell>
            <TableCell align="right">Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {((users.data ?? []) as UserRow[]).map((user) => (
            <TableRow key={user.id} hover>
              <TableCell>
                <Typography fontWeight={700}>{user.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {user.email}
                </Typography>
              </TableCell>
              <TableCell>
                <StatusChip value={user.role} />
              </TableCell>
              <TableCell>
                <StatusChip value={user.status} />
              </TableCell>
              <TableCell>{user.sellerProfile?.displayName ?? "Nenhum"}</TableCell>
              <TableCell align="right">
                <Stack direction="row" gap={1} justifyContent="flex-end" flexWrap="wrap">
                  {user.role === "USER" && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => promote.mutate({ userId: user.id, role: "SELLER" })}
                    >
                      Tornar vendedor
                    </Button>
                  )}
                  {user.role !== "ADMIN" && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="warning"
                      onClick={() => promote.mutate({ userId: user.id, role: "ADMIN" })}
                    >
                      Tornar admin
                    </Button>
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    color={user.status === "SUSPENDED" ? "success" : "error"}
                    onClick={() =>
                      setStatus.mutate({
                        userId: user.id,
                        status: user.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED",
                      })
                    }
                  >
                    {user.status === "SUSPENDED" ? "Reativar" : "Suspender"}
                  </Button>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}

function BannersPanel() {
  const banners = trpc.admin.banners.useQuery();
  const utils = trpc.useUtils();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [imageUrl, setImageUrl] = useState("/placeholders/banner-hero.jpg");
  const [linkUrl, setLinkUrl] = useState("/search");
  const create = trpc.admin.createBanner.useMutation({
    onSuccess: async () => {
      setTitle("");
      setSubtitle("");
      await utils.admin.banners.invalidate();
    },
  });
  const update = trpc.admin.updateBanner.useMutation({
    onSuccess: async () => utils.admin.banners.invalidate(),
  });

  return (
    <Stack spacing={3}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={800} gutterBottom>
          Criar banner
        </Typography>
        <Stack direction={{ xs: "column", md: "row" }} gap={2}>
          <TextField label="Título" value={title} onChange={(event) => setTitle(event.target.value)} />
          <TextField
            label="Subtítulo"
            value={subtitle}
            onChange={(event) => setSubtitle(event.target.value)}
          />
          <TextField
            label="URL da imagem"
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
          />
          <TextField
            label="URL do link"
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
          />
          <Button
            variant="contained"
            onClick={() =>
              create.mutate({
                title,
                subtitle,
                imageUrl,
                linkUrl,
                sortOrder: 0,
                active: true,
              })
            }
            disabled={title.trim().length < 3 || !imageUrl}
          >
            Criar
          </Button>
        </Stack>
      </Paper>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={800} gutterBottom>
          Banners da home
        </Typography>
        <Stack divider={<Divider flexItem />} spacing={2}>
          {((banners.data ?? []) as BannerRow[]).map((banner) => (
            <Stack
              key={banner.id}
              direction={{ xs: "column", md: "row" }}
              gap={2}
              alignItems={{ xs: "stretch", md: "center" }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={700}>{banner.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {banner.subtitle ?? "Sem subtítulo"} · {banner.imageUrl}
                </Typography>
              </Box>
              <TextField
                select
                size="small"
                label="Ordem"
                value={banner.sortOrder}
                onChange={(event) =>
                  update.mutate({ id: banner.id, sortOrder: Number(event.target.value) })
                }
                sx={{ width: 96 }}
              >
                {[0, 1, 2, 3, 4, 5].map((value) => (
                  <MenuItem key={value} value={value}>
                    {value}
                  </MenuItem>
                ))}
              </TextField>
              <FormControlLabel
                control={
                  <Switch
                    checked={banner.active}
                    onChange={(event) =>
                      update.mutate({ id: banner.id, active: event.target.checked })
                    }
                  />
                }
                label="Ativo"
              />
            </Stack>
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
}

function ReportsPanel() {
  const reports = trpc.admin.reports.useQuery();
  const utils = trpc.useUtils();
  const resolve = trpc.admin.resolveReport.useMutation({
    onSuccess: async () => utils.admin.reports.invalidate(),
  });

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight={800} gutterBottom>
        Denúncias
      </Typography>
      <Stack divider={<Divider flexItem />} spacing={2}>
        {((reports.data ?? []) as ReportRow[]).map((report) => (
          <Stack key={report.id} direction={{ xs: "column", md: "row" }} gap={2}>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" gap={1} alignItems="center" sx={{ mb: 0.5 }}>
                <Typography fontWeight={700}>{report.reason}</Typography>
                <StatusChip value={report.resolved ? "RESOLVED" : "OPEN"} />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Denunciante: {report.reporter.name} ({report.reporter.email})
              </Typography>
              <Typography variant="body2">
                Anúncio:{" "}
                {report.listing ? (
                  <Link href={`/listings/${report.listing.slug}`}>{report.listing.title}</Link>
                ) : (
                  "Anúncio removido"
                )}
              </Typography>
              {report.details && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {report.details}
                </Typography>
              )}
            </Box>
            <Button
              variant="outlined"
              onClick={() => resolve.mutate({ id: report.id, resolved: !report.resolved })}
            >
              {report.resolved ? "Reabrir" : "Resolver"}
            </Button>
          </Stack>
        ))}
        {!reports.data?.length && <Typography color="text.secondary">Nenhuma denúncia encontrada.</Typography>}
      </Stack>
    </Paper>
  );
}

function JobsPanel() {
  const jobs = trpc.admin.jobs.useQuery(undefined, { refetchInterval: 10000 });
  const grouped = useMemo(() => {
    const rows = (jobs.data ?? []) as JobRow[];
    return rows.reduce<Record<string, number>>((acc, job) => {
      acc[job.status] = (acc[job.status] ?? 0) + 1;
      return acc;
    }, {});
  }, [jobs.data]);

  return (
    <Stack spacing={3}>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        {Object.entries(grouped).map(([status, count]) => (
          <Chip key={status} label={`${status}: ${count}`} variant="outlined" />
        ))}
      </Box>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={800} gutterBottom>
          Jobs em segundo plano
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fila</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Tentativas</TableCell>
              <TableCell>Erro</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {((jobs.data ?? []) as JobRow[]).map((job) => (
              <TableRow key={job.id} hover>
                <TableCell>{job.queue}</TableCell>
                <TableCell>
                  <StatusChip value={job.status} />
                </TableCell>
                <TableCell>{job.attempts}</TableCell>
                <TableCell>{job.error ?? "Nenhum"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
}

export function AdminClient({ section }: { section: AdminSection }) {
  let content: React.ReactNode;
  if (section === "listings") content = <ListingsPanel />;
  else if (section === "users") content = <UsersPanel />;
  else if (section === "banners") content = <BannersPanel />;
  else if (section === "reports") content = <ReportsPanel />;
  else if (section === "jobs") content = <JobsPanel />;
  else content = <OverviewPanel />;

  return <AdminGate section={section}>{content}</AdminGate>;
}
