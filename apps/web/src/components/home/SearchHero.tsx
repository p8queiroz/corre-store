"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useRouter } from "next/navigation";

export function SearchHero() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  }

  return (
    <Card sx={{ bgcolor: "rgba(255,255,255,0.12)", color: "white" }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <SearchIcon />
          <Typography variant="subtitle1" fontWeight={700}>
            Buscar anúncios
          </Typography>
        </Box>
        <Box component="form" onSubmit={handleSearch}>
          <TextField
            fullWidth
            placeholder='Busque por "mochila quase nova"'
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-root": {
                bgcolor: "rgba(255,255,255,0.95)",
              },
            }}
          />
          <Button
            fullWidth
            type="submit"
            variant="contained"
            color="secondary"
            startIcon={<SearchIcon />}
          >
            Buscar
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
