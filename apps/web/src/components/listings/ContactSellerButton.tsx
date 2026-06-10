"use client";

import { Button } from "@mui/material";
import MailOutlineIcon from "@mui/icons-material/MailOutline";

export function ContactSellerButton({ listingId }: { listingId: string }) {
  return (
    <Button
      variant="contained"
      size="large"
      startIcon={<MailOutlineIcon />}
      onClick={() => alert(`Fluxo de contato do anúncio ${listingId} — implementar na fase 2`)}
    >
      Falar com o vendedor
    </Button>
  );
}
