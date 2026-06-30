"use client";

import Link from "next/link";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Alert, Box, Button, Container, Paper, TextField, Typography } from "@mui/material";
import { forgotPasswordSchema } from "@stride/shared";
import type { z } from "zod";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
type ForgotInput = z.input<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotInput>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(data: ForgotInput) {
    setMessage(null);
    setError(null);
    const res = await fetch(`${apiUrl}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      setError("Não foi possível iniciar a recuperação.");
      return;
    }
    setMessage("Se esse email existir, enviaremos um link de recuperação.");
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Recuperar senha
        </Typography>
        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <TextField fullWidth label="Email" margin="normal" {...register("email")} error={!!errors.email} helperText={errors.email?.message} />
          <Button type="submit" fullWidth variant="contained" size="large" sx={{ mt: 2 }} disabled={isSubmitting}>
            Enviar link
          </Button>
        </Box>
        <Typography variant="body2" sx={{ mt: 2 }}>
          <Link href="/login">Voltar para login</Link>
        </Typography>
      </Paper>
    </Container>
  );
}
