"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Alert, Box, Button, Container, Paper, TextField, Typography } from "@mui/material";
import { resetPasswordSchema } from "@stride/shared";
import type { z } from "zod";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
type ResetInput = z.input<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: params.get("token") ?? "" },
  });

  async function onSubmit(data: ResetInput) {
    setMessage(null);
    setError(null);
    const res = await fetch(`${apiUrl}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      setError(body.error ?? "Token inválido ou expirado.");
      return;
    }
    setMessage("Senha redefinida. Você já pode entrar.");
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Redefinir senha
        </Typography>
        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <input type="hidden" {...register("token")} />
          <TextField fullWidth label="Nova senha" type="password" margin="normal" {...register("password")} error={!!errors.password} helperText={errors.password?.message} />
          <TextField fullWidth label="Confirmar senha" type="password" margin="normal" {...register("confirmPassword")} error={!!errors.confirmPassword} helperText={errors.confirmPassword?.message} />
          <Button type="submit" fullWidth variant="contained" size="large" sx={{ mt: 2 }} disabled={isSubmitting}>
            Redefinir senha
          </Button>
        </Box>
        <Typography variant="body2" sx={{ mt: 2 }}>
          <Link href="/login">Ir para login</Link>
        </Typography>
      </Paper>
    </Container>
  );
}
