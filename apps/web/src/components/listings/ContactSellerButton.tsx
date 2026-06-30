"use client";

import Link from "next/link";
import { Alert, Button, Stack, Typography } from "@mui/material";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import { trpc } from "@/lib/trpc";
import { SafetyWarning } from "@/components/safety/SafetyWarning";

export function ContactSellerButton({
  listingId,
  listingTitle,
}: {
  listingId: string;
  listingTitle: string;
}) {
  const contact = trpc.contact.seller.useMutation({
    onSuccess: (result) => {
      window.open(result.contactUrl, "_blank", "noopener,noreferrer");
    },
  });

  function startContact() {
    contact.mutate({
      listingId,
      listingUrl: window.location.href,
    });
  }

  return (
    <Stack spacing={2}>
      <SafetyWarning compact />
      {contact.error && (
        <Alert severity="error">
          {contact.error.data?.code === "UNAUTHORIZED" ? (
            <>
              Entre para contactar o vendedor.{" "}
              <Link href="/login">Ir para login</Link>
            </>
          ) : (
            contact.error.message
          )}
        </Alert>
      )}
      <Button
        variant="contained"
        size="large"
        color="success"
        startIcon={<WhatsAppIcon />}
        onClick={startContact}
        disabled={contact.isPending}
      >
        Contact seller on WhatsApp
      </Button>
      <Typography variant="caption" color="text.secondary">
        A mensagem será preenchida com contexto do anúncio: {listingTitle}.
      </Typography>
    </Stack>
  );
}
