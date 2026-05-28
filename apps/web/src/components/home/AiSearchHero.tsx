"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";

/**
 * Natural language discovery — demonstrates AI product search flow.
 * See docs/06-ai-features.md § Product Discovery
 */
export function AiSearchHero() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const search = trpc.ai.naturalLanguageSearch.useMutation();

  async function handleAiSearch() {
    const result = await search.mutateAsync({ query });
    const keywords = result.items?.length
      ? query
      : query;
    router.push(`/search?q=${encodeURIComponent(keywords)}&ai=1`);
  }

  return (
    <Card sx={{ bgcolor: "rgba(255,255,255,0.12)", color: "white" }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <AutoAwesomeIcon />
          <Typography variant="subtitle1" fontWeight={700}>
            AI discovery
          </Typography>
        </Box>
        <TextField
          fullWidth
          multiline
          minRows={2}
          placeholder="Show me lightweight running shoes for marathon beginners"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{
            mb: 2,
            "& .MuiOutlinedInput-root": {
              bgcolor: "rgba(255,255,255,0.95)",
            },
          }}
        />
        <Button
          fullWidth
          variant="contained"
          color="secondary"
          disabled={!query.trim() || search.isPending}
          onClick={() => void handleAiSearch()}
          startIcon={search.isPending ? <CircularProgress size={18} /> : <AutoAwesomeIcon />}
        >
          Search with AI
        </Button>
      </CardContent>
    </Card>
  );
}
