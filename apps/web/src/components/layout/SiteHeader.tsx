"use client";

import Link from "next/link";
import {
  AppBar,
  Box,
  Button,
  Container,
  IconButton,
  InputAdornment,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SiteHeader() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ gap: 2, py: 1 }}>
          <Typography
            component={Link}
            href="/"
            variant="h6"
            sx={{
              fontWeight: 800,
              color: "primary.main",
              textDecoration: "none",
              mr: 2,
            }}
          >
            ReRun
          </Typography>

          <Box
            component="form"
            onSubmit={handleSearch}
            sx={{ flex: 1, maxWidth: 560 }}
          >
            <TextField
              fullWidth
              size="small"
              placeholder='Busque por "mochila quase nova"'
              value={q}
              onChange={(e) => setQ(e.target.value)}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton type="submit" edge="end" aria-label="Buscar">
                        <SearchIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          <Button component={Link} href="/sell" variant="contained" color="secondary">
            Vender
          </Button>
          <Button component={Link} href="/seller" variant="outlined">
            Meus anúncios
          </Button>
          <Button component={Link} href="/safety" variant="text">
            Segurança
          </Button>
          <IconButton component={Link} href="/favorites" aria-label="Favoritos">
            <FavoriteBorderIcon />
          </IconButton>
          <IconButton component={Link} href="/account" aria-label="Minha conta">
            <AccountCircleIcon />
          </IconButton>
          <Button component={Link} href="/login" variant="outlined">
            Entrar
          </Button>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
