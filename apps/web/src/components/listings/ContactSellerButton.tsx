"use client";

import { Button } from "@mui/material";
import MailOutlineIcon from "@mui/icons-material/MailOutline";

export function ContactSellerButton({ listingId }: { listingId: string }) {
  return (
    <Button
      variant="contained"
      size="large"
      startIcon={<MailOutlineIcon />}
      onClick={() => alert(`Inquiry flow for listing ${listingId} — implement in Phase 2`)}
    >
      Contact seller
    </Button>
  );
}
