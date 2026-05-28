"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Box,
  Button,
  Container,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import {
  createListingSchema,
  type CreateListingInput,
  listingConditionEnum,
} from "@stride/shared";
import { trpc } from "@/lib/trpc";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

export default function SellPage() {
  const createListing = trpc.listings.create.useMutation();
  const aiAssist = trpc.ai.assistListing.useMutation();

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<CreateListingInput>({
    resolver: zodResolver(createListingSchema),
    defaultValues: { tags: [] },
  });

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

  async function onSubmit(data: CreateListingInput) {
    await createListing.mutateAsync(data);
    alert("Listing submitted for review!");
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
            disabled={createListing.isPending}
          >
            Submit for review
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
